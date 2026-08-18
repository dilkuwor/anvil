import type { Latency } from "../models/types";

/** M/M/1-inspired extra delay. Utilization 0.7 already adds noticeable wait. */
export function queueingMultiplier(utilization: number): number {
  const u = Math.min(Math.max(utilization, 0), 0.97);
  if (u < 0.5) return 1;
  return 1 + (u / Math.max(0.03, 1 - u)) * 0.12;
}

export function applyQueueing(base: Latency, utilization: number): Latency {
  const factor = queueingMultiplier(utilization);
  return {
    p50: base.p50 * factor,
    p95: base.p95 * factor * (utilization > 0.85 ? 1.15 : 1),
    p99: base.p99 * factor * (utilization > 0.85 ? 1.35 : 1),
  };
}

export function peakUtil(utilization: Record<string, number>): number {
  return Object.values(utilization).reduce((max, value) => Math.max(max, value), 0);
}

export function num(config: Record<string, string | number | boolean>, key: string, fallback = 0): number {
  const value = config[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

export function bool(config: Record<string, string | number | boolean>, key: string, fallback = false): boolean {
  const value = config[key];
  if (typeof value === "boolean") return value;
  return fallback;
}

export function str(config: Record<string, string | number | boolean>, key: string, fallback = ""): string {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}
