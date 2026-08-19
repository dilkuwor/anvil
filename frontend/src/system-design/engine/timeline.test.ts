import { describe, expect, it } from "vitest";

import { getKind } from "../components/registry";
import type { SimulationResult, SystemDesign } from "../models/types";
import { runSimulation } from "./run";
import { formatTimelineClock, interpolateTimeline, viewAtCursor } from "./timeline";

function design(): SystemDesign {
  const now = "2026-08-18T00:00:00.000Z";
  const client = { id: "c1", type: "client" as const, label: "Users", x: 0, y: 0, config: { ...getKind("client").defaultConfig } };
  const api = {
    id: "api1",
    type: "api_server" as const,
    label: "API",
    x: 0,
    y: 0,
    config: { ...getKind("api_server").defaultConfig, instances: 12 },
  };
  return {
    id: "d1",
    name: "Test",
    nodes: [client, api],
    edges: [{ id: "e1", source: "c1", target: "api1" }],
    workload: {
      dau: 10_000_000,
      concurrentUsers: 50_000,
      requestsPerUserDay: 20,
      readRatio: 0.9,
      avgRequestBytes: 800,
      avgResponseBytes: 2000,
      peakMultiplier: 4,
      trafficGrowth: 0.1,
    },
    slo: { availability: 0.999, p95Ms: 250, p99Ms: 600, errorRate: 0.01, rpoSeconds: 60, rtoSeconds: 300 },
    difficulty: "intermediate",
    createdAt: now,
    updatedAt: now,
  };
}

describe("timeline playback", () => {
  it("interpolates between samples and formats the clock", () => {
    const sample = interpolateTimeline(
      [
        { t: 0, label: "0:00", rps: 100, cpu: 0.2, p95: 40, errors: 0.001 },
        { t: 1, label: "8:00", rps: 200, cpu: 0.8, p95: 80, errors: 0.01 },
      ],
      0.5,
    );
    expect(sample.rps).toBe(150);
    expect(sample.p95).toBe(60);
    expect(formatTimelineClock(0.5)).toBe("4:00");
  });

  it("matches the peak run at cursor 1 and lowers load at cursor 0", () => {
    const peak = runSimulation({ design: design(), failures: [] });
    const atPeak = viewAtCursor(peak, 1);
    const atIdle = viewAtCursor(peak, 0);
    expect(atPeak.throughput.processedRps).toBeCloseTo(peak.throughput.processedRps, 5);
    expect(atIdle.throughput.processedRps).toBeLessThan(peak.throughput.processedRps * 0.5);
    expect(atIdle.nodes.api1.processedRps).toBeLessThan(peak.nodes.api1.processedRps);
    expect(Object.values(atIdle.edges)[0]?.rps ?? 0).toBeLessThan(Object.values(peak.edges)[0]?.rps ?? 0);
  });

  it("updates SLO actuals as load changes", () => {
    const peak = runSimulation({ design: design(), failures: [] });
    const atIdle = viewAtCursor(peak, 0);
    const idleError = atIdle.slo.find((item) => item.key === "errorRate");
    const peakError = peak.slo.find((item) => item.key === "errorRate");
    expect(idleError?.actual).not.toBe(peakError?.actual);
  });

  it("keeps storage and cost stable while traffic changes", () => {
    const peak = runSimulation({ design: design(), failures: [] }) as SimulationResult;
    const atIdle = viewAtCursor(peak, 0);
    expect(atIdle.cost.total).toBe(peak.cost.total);
    expect(atIdle.storage).toEqual(peak.storage);
  });
});
