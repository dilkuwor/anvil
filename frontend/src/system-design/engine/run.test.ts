import { describe, expect, it } from "vitest";

import { getKind } from "../components/registry";
import { deriveWorkload } from "../models/workload";
import type { SystemDesign } from "../models/types";
import { runSimulation } from "./run";

function design(partial?: Partial<SystemDesign>): SystemDesign {
  const now = "2026-08-18T00:00:00.000Z";
  const client = { id: "c1", type: "client" as const, label: "Users", x: 0, y: 0, config: { ...getKind("client").defaultConfig } };
  const lb = { id: "lb1", type: "load_balancer" as const, label: "LB", x: 0, y: 0, config: { ...getKind("load_balancer").defaultConfig } };
  const api = { id: "api1", type: "api_server" as const, label: "API", x: 0, y: 0, config: { ...getKind("api_server").defaultConfig, instances: 12 } };
  const redis = { id: "r1", type: "redis" as const, label: "Redis", x: 0, y: 0, config: { ...getKind("redis").defaultConfig, hitRatio: 0.9 } };
  const db = { id: "db1", type: "postgresql" as const, label: "Postgres", x: 0, y: 0, config: { ...getKind("postgresql").defaultConfig } };
  return {
    id: "d1",
    name: "Test",
    nodes: [client, lb, api, redis, db],
    edges: [
      { id: "e1", source: "c1", target: "lb1" },
      { id: "e2", source: "lb1", target: "api1" },
      { id: "e3", source: "api1", target: "r1" },
      { id: "e4", source: "api1", target: "db1" },
    ],
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
    ...partial,
  };
}

describe("system design simulation engine", () => {
  it("derives peak RPS from DAU", () => {
    const derived = deriveWorkload({
      dau: 100_000_000,
      concurrentUsers: 1,
      requestsPerUserDay: 20,
      readRatio: 0.9,
      avgRequestBytes: 100,
      avgResponseBytes: 100,
      peakMultiplier: 5,
      trafficGrowth: 0,
    });
    expect(Math.round(derived.dailyRequests)).toBe(2_000_000_000);
    expect(Math.round(derived.avgRps)).toBe(23148);
    expect(Math.round(derived.peakRps)).toBe(115741);
  });

  it("sends cache misses to the database", () => {
    const result = runSimulation({ design: design(), failures: [] });
    const redis = result.nodes.r1;
    const db = result.nodes.db1;
    expect(redis.incomingRps).toBeGreaterThan(0);
    expect(db.incomingRps).toBeGreaterThan(0);
    expect(db.incomingRps).toBeLessThan(redis.incomingRps);
    expect(result.cost.total).toBeGreaterThan(0);
    expect(result.timeline.length).toBeGreaterThan(2);
  });

  it("flags an undersized database as a bottleneck", () => {
    const tiny = design();
    const db = tiny.nodes.find((node) => node.id === "db1");
    if (db) {
      db.config.readCapacity = 50;
      db.config.writeCapacity = 20;
    }
    const result = runSimulation({ design: tiny, failures: [] });
    expect(result.bottlenecks.some((item) => item.nodeId === "db1")).toBe(true);
    expect(result.nodes.db1.health === "critical" || result.nodes.db1.health === "overloaded").toBe(true);
  });

  it("rejects overflow at the rate limiter", () => {
    const limited = design({
      nodes: [
        { id: "c1", type: "client", label: "Users", x: 0, y: 0, config: {} },
        { id: "rl1", type: "rate_limiter", label: "Limiter", x: 0, y: 0, config: { ...getKind("rate_limiter").defaultConfig, limitRps: 100, burst: 0 } },
      ],
      edges: [{ id: "e1", source: "c1", target: "rl1" }],
    });
    const result = runSimulation({ design: limited, failures: [] });
    expect(result.nodes.rl1.rejectedRps).toBeGreaterThan(1000);
  });
});
