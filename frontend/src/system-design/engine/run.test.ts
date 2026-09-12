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

  it("sends cache misses plus writes to the database", () => {
    const result = runSimulation({ design: design(), failures: [] });
    const api = result.nodes.api1;
    const redis = result.nodes.r1;
    const db = result.nodes.db1;
    expect(redis.incomingRps).toBeGreaterThan(0);
    const misses = redis.incomingRps * 0.1;
    const writes = api.processedRps * 0.1;
    expect(db.incomingRps).toBeCloseTo(misses + writes, 0);
    expect(db.incomingRps).toBeLessThan(redis.incomingRps);
    expect(result.cost.total).toBeGreaterThan(0);
    expect(result.timeline.length).toBeGreaterThan(2);
  });

  it("evaluates the store after the cache even when the store edge is drawn first", () => {
    const reordered = design();
    reordered.edges = [
      { id: "e1", source: "c1", target: "lb1" },
      { id: "e2", source: "lb1", target: "api1" },
      { id: "e4", source: "api1", target: "db1" },
      { id: "e3", source: "api1", target: "r1" },
    ];
    const result = runSimulation({ design: reordered, failures: [] });
    const canonical = runSimulation({ design: design(), failures: [] });
    expect(result.nodes.db1.incomingRps).toBeCloseTo(canonical.nodes.db1.incomingRps, 5);
    expect(result.nodes.db1.processedRps).toBeCloseTo(canonical.nodes.db1.processedRps, 5);
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

  it("sends every read to the database when the cache is down", () => {
    const healthy = runSimulation({ design: design(), failures: [] });
    const cold = runSimulation({ design: design(), failures: [{ id: "cache_down", type: "cache_down" }] });
    expect(cold.nodes.db1.incomingRps).toBeGreaterThan(healthy.nodes.db1.incomingRps * 5);
    expect(cold.nodes.r1.droppedRps).toBeLessThan(1);
    expect(cold.nodes.r1.notes[0]).toContain("fall through");
  });

  it("explains an injected failure instead of suggesting shards for it", () => {
    const dead = runSimulation({ design: design(), failures: [{ id: "database_down", type: "database_down" }] });
    const db = dead.bottlenecks.find((item) => item.nodeId === "db1");
    expect(db?.why).toContain("Database impaired");
    expect(db?.fix).toContain("failure itself");
  });

  it("stops the critical path at a queue and keeps async losses out of the error rate", () => {
    const base = design();
    const kafka = { id: "k1", type: "kafka" as const, label: "Events", x: 0, y: 0, config: { ...getKind("kafka").defaultConfig } };
    const workers = { id: "w1", type: "worker" as const, label: "Workers", x: 0, y: 0, config: { ...getKind("worker").defaultConfig, instances: 1, concurrency: 1, jobMs: 5000 } };
    const async = design({
      nodes: [...base.nodes.map((node) => (node.id === "api1" ? { ...node, config: { ...node.config, instances: 80 } } : node)), kafka, workers],
      edges: [...base.edges, { id: "e5", source: "api1", target: "k1" }, { id: "e6", source: "k1", target: "w1" }],
    });
    const result = runSimulation({ design: async, failures: [] });
    expect(result.criticalPath.map((hop) => hop.nodeId)).not.toContain("w1");
    expect(result.latency.p95).toBeLessThan(1000);
    expect(result.nodes.w1.droppedRps).toBeGreaterThan(100);
    expect(result.throughput.backlogRps).toBeGreaterThan(100);
    expect(result.errorRate).toBeLessThan(0.02);
    expect(result.nodes.k1.notes[0]).toContain("handed to the consumers");
  });

  it("weights an edge so only that share of the flow takes it", () => {
    const base = design();
    const search = { id: "s1", type: "search_index" as const, label: "Search", x: 0, y: 0, config: { ...getKind("search_index").defaultConfig } };
    const full = design({ nodes: [...base.nodes, search], edges: [...base.edges, { id: "e5", source: "api1", target: "s1" }] });
    const slice = design({ nodes: [...base.nodes, search], edges: [...base.edges, { id: "e5", source: "api1", target: "s1", weight: 0.05 }] });
    const all = runSimulation({ design: full, failures: [] });
    const some = runSimulation({ design: slice, failures: [] });
    expect(some.nodes.s1.incomingRps).toBeCloseTo(all.nodes.s1.incomingRps * 0.05, 3);
    expect(some.edges.e5.rps).toBeCloseTo(some.nodes.s1.incomingRps, 5);
  });

  it("sizes database connections by Little's law rather than raw rps", () => {
    const result = runSimulation({ design: design(), failures: [] });
    const db = result.nodes.db1;
    expect(db.utilization.connections).toBeLessThan(0.2);
    expect(db.incomingRps).toBeGreaterThan(300);
  });
});
