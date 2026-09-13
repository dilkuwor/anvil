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
  avgRecordBytes: 1_000,
};

export const DEFAULT_RECORD_BYTES = 1_000;

/** Interview rule of thumb: cache the hottest 20% of a day's reads. */
export const CACHE_WORKING_SET_RATIO = 0.2;

export const GB = 1_000_000_000;

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
  const writesPerDay = dailyRequests * (1 - config.readRatio);
  const recordBytes = config.avgRecordBytes ?? DEFAULT_RECORD_BYTES;
  const storageYearGb = (writesPerDay * recordBytes * 365) / GB;
  const readsPerDay = dailyRequests * config.readRatio;
  return {
    dailyRequests,
    monthlyRequests: dailyRequests * 30,
    avgRps,
    peakRps,
    readRps,
    writeRps,
    ingressBps: peakRps * config.avgRequestBytes,
    egressBps: peakRps * config.avgResponseBytes,
    writesPerDay,
    storageYearGb,
    storageFiveYearGb: storageYearGb * 5,
    cacheWorkingSetGb: (readsPerDay * CACHE_WORKING_SET_RATIO * config.avgResponseBytes) / GB,
  };
}
