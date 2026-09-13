import { apiInstanceRps } from "../components/library";
import type { DesignNode, EstimationStep, WorkloadConfig } from "../models/types";
import { CACHE_WORKING_SET_RATIO, DEFAULT_RECORD_BYTES, deriveWorkload } from "../models/workload";
import { formatBytesPerSec, formatCompact, formatGb, formatRps } from "../utils/format";

/**
 * The back-of-envelope worksheet an interviewer expects in the first five minutes:
 * DAU → QPS → peak → bandwidth → storage → cache → servers. Every line shows the
 * formula with the real numbers so it can be copied onto a whiteboard.
 */
export function estimateWorkload(config: WorkloadConfig, nodes: DesignNode[] = []): EstimationStep[] {
  const derived = deriveWorkload(config);
  const recordBytes = config.avgRecordBytes ?? DEFAULT_RECORD_BYTES;
  const writeShare = 1 - config.readRatio;
  const api = nodes.find((node) => node.type === "api_server" && !node.disabled);
  const perServer = api ? perInstanceRps(api) : 1_000;
  const serversNeeded = Math.ceil(derived.peakRps / Math.max(perServer, 1));

  return [
    {
      key: "daily",
      label: "Daily requests",
      formula: `${formatCompact(config.dau)} DAU × ${config.requestsPerUserDay} req/user/day`,
      value: formatCompact(derived.dailyRequests),
    },
    {
      key: "avgRps",
      label: "Average QPS",
      formula: `${formatCompact(derived.dailyRequests)} ÷ 86,400 s`,
      value: `${formatRps(derived.avgRps)} rps`,
      note: "Round 86,400 to ~100k in your head: daily ÷ 100k is close enough.",
    },
    {
      key: "peakRps",
      label: "Peak QPS",
      formula: `${formatRps(derived.avgRps)} × ${config.peakMultiplier}× peak`,
      value: `${formatRps(derived.peakRps)} rps`,
      note: "Size everything for peak, not average. 2–5× is the usual interview range.",
    },
    {
      key: "split",
      label: "Reads / writes at peak",
      formula: `${formatRps(derived.peakRps)} × ${pct(config.readRatio)} / ${pct(writeShare)}`,
      value: `${formatRps(derived.readRps)} / ${formatRps(derived.writeRps)} rps`,
      note: config.readRatio >= 0.7 ? "Read-heavy: caches and read replicas pay off." : "Write-heavy: think queues, sharding, and append-only stores.",
    },
    {
      key: "ingress",
      label: "Ingress bandwidth",
      formula: `${formatRps(derived.peakRps)} rps × ${formatCompact(config.avgRequestBytes)} B`,
      value: formatBytesPerSec(derived.ingressBps),
    },
    {
      key: "egress",
      label: "Egress bandwidth",
      formula: `${formatRps(derived.peakRps)} rps × ${formatCompact(config.avgResponseBytes)} B`,
      value: formatBytesPerSec(derived.egressBps),
      note: derived.egressBps > 1_000_000_000 ? "Over 1 GB/s of egress: a CDN is not optional." : undefined,
    },
    {
      key: "writesPerDay",
      label: "Writes per day",
      formula: `${formatCompact(derived.dailyRequests)} × ${pct(writeShare)} writes`,
      value: formatCompact(derived.writesPerDay),
    },
    {
      key: "storageYear",
      label: "Storage per year",
      formula: `${formatCompact(derived.writesPerDay)} × ${formatCompact(recordBytes)} B × 365`,
      value: formatGb(derived.storageYearGb),
      note: "Before replicas, indexes, and backups. The Storage tab adds those.",
    },
    {
      key: "storageFive",
      label: "Storage over 5 years",
      formula: `${formatGb(derived.storageYearGb)} × 5`,
      value: formatGb(derived.storageFiveYearGb),
    },
    {
      key: "cache",
      label: "Cache working set",
      formula: `${pct(CACHE_WORKING_SET_RATIO)} of ${formatCompact(derived.dailyRequests * config.readRatio)} daily reads × ${formatCompact(config.avgResponseBytes)} B`,
      value: formatGb(derived.cacheWorkingSetGb),
      note: "80/20 rule: 20% of items serve 80% of reads. This is the memory to ask for.",
    },
    {
      key: "servers",
      label: "App servers at peak",
      formula: `${formatRps(derived.peakRps)} rps ÷ ${formatRps(perServer)} rps per server`,
      value: `${serversNeeded.toLocaleString()} server${serversNeeded === 1 ? "" : "s"}`,
      note: api
        ? `Per-server figure comes from “${api.label}”: vCPU × 1000 ÷ avg ms, at 75% headroom.`
        : "No API server on the canvas yet, so 1,000 rps per server is assumed.",
    },
  ];
}

/** Effective RPS one API instance can take, using the same formula as the simulation. */
export function perInstanceRps(node: DesignNode): number {
  return apiInstanceRps(node.config);
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
