import { describe, expect, it } from "vitest";

import { getKind } from "../components/registry";
import type { WorkloadConfig } from "../models/types";
import { deriveWorkload } from "../models/workload";
import { estimateWorkload, perInstanceRps } from "./estimate";

const workload: WorkloadConfig = {
  dau: 100_000_000,
  concurrentUsers: 1,
  requestsPerUserDay: 20,
  readRatio: 0.9,
  avgRequestBytes: 100,
  avgResponseBytes: 1000,
  peakMultiplier: 5,
  trafficGrowth: 0,
  avgRecordBytes: 500,
};

describe("estimation worksheet", () => {
  it("derives storage and cache sizes from the workload", () => {
    const derived = deriveWorkload(workload);
    expect(Math.round(derived.writesPerDay)).toBe(200_000_000);
    expect(derived.storageYearGb).toBeCloseTo(36_500, 0);
    expect(derived.storageFiveYearGb).toBeCloseTo(182_500, 0);
    expect(derived.cacheWorkingSetGb).toBeCloseTo(360, 0);
  });

  it("defaults the record size when older designs omit it", () => {
    const legacy = deriveWorkload({ ...workload, avgRecordBytes: undefined });
    expect(legacy.storageYearGb).toBeCloseTo(73_000, 0);
  });

  it("lists every whiteboard step with the formula spelled out", () => {
    const steps = estimateWorkload(workload);
    expect(steps.map((step) => step.key)).toEqual([
      "daily",
      "avgRps",
      "peakRps",
      "split",
      "ingress",
      "egress",
      "writesPerDay",
      "storageYear",
      "storageFive",
      "cache",
      "servers",
    ]);
    expect(steps[0].formula).toContain("100M DAU × 20");
    expect(steps[2].value).toBe("116k rps");
    expect(steps[10].note).toContain("1,000 rps per server is assumed");
  });

  it("uses the API server on the canvas to size the fleet", () => {
    const api = { id: "api", type: "api_server" as const, label: "API", x: 0, y: 0, config: { ...getKind("api_server").defaultConfig, vcpu: 8, avgLatencyMs: 10 } };
    expect(perInstanceRps(api)).toBe(600);
    const servers = estimateWorkload(workload, [api]).find((step) => step.key === "servers");
    expect(servers?.value).toBe("193 servers");
    expect(servers?.note).toContain("API");
  });
});
