import type { DerivedWorkload, SloConfig, WorkloadConfig } from "./types";

export const DEFAULT_WORKLOAD: WorkloadConfig = {
  dau: 1_000_000,
  concurrentUsers: 20_000,
  requestsPerUserDay: 20,
  readRatio: 0.9,
  avgRequestBytes: 800,
  avgResponseBytes: 4_000,
  peakMultiplier: 4,
  trafficGrowth: 0.2,
};

export const DEFAULT_SLO: SloConfig = {
  availability: 0.9999,
  p95Ms: 200,
  p99Ms: 500,
  errorRate: 0.001,
  rpoSeconds: 60,
  rtoSeconds: 300,
};

export function deriveWorkload(config: WorkloadConfig): DerivedWorkload {
  const dailyRequests = config.dau * config.requestsPerUserDay;
  const avgRps = dailyRequests / 86_400;
  const peakRps = avgRps * config.peakMultiplier;
  const readRps = peakRps * config.readRatio;
  const writeRps = peakRps * (1 - config.readRatio);
  return {
    dailyRequests,
    monthlyRequests: dailyRequests * 30,
    avgRps,
    peakRps,
    readRps,
    writeRps,
    ingressBps: peakRps * config.avgRequestBytes,
    egressBps: peakRps * config.avgResponseBytes,
  };
}
