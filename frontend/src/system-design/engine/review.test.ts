import { describe, expect, it } from "vitest";

import { getKind } from "../components/registry";
import type { ComponentType, DesignNode, SystemDesign } from "../models/types";
import { runSimulation } from "./run";
import { availabilityEstimate, redundancyOf } from "./review";

function node(id: string, type: ComponentType, config: Record<string, string | number | boolean> = {}): DesignNode {
  return { id, type, label: id, x: 0, y: 0, config: { ...getKind(type).defaultConfig, ...config } };
}

function design(nodes: DesignNode[], edges: [string, string][], overrides?: Partial<SystemDesign>): SystemDesign {
  const now = "2026-08-18T00:00:00.000Z";
  return {
    id: "d1",
    name: "Test",
    nodes,
    edges: edges.map(([source, target]) => ({ id: `${source}-${target}`, source, target })),
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
    ...overrides,
  };
}

const solid = () =>
  design(
    [
      node("users", "client"),
      node("limiter", "rate_limiter", { limitRps: 200_000 }),
      node("lb", "load_balancer", { instances: 2 }),
      node("api", "api_server", { instances: 80, autoscaling: true }),
      node("cache", "redis", { replicas: 1, hitRatio: 0.9 }),
      node("db", "postgresql", { readReplicas: 2, storageGb: 10_000 }),
    ],
    [
      ["users", "limiter"],
      ["limiter", "lb"],
      ["lb", "api"],
      ["api", "cache"],
      ["api", "db"],
    ],
  );

describe("design review", () => {
  it("grades a well-formed design highly with no single points of failure", () => {
    const result = runSimulation({ design: solid(), failures: [] });
    const { review } = result;
    expect(review.score).toBeGreaterThanOrEqual(85);
    expect(review.grade).toBe("A");
    expect(review.checks.some((check) => check.id === "rel-spof" && check.status === "pass")).toBe(true);
    expect(review.checks.find((check) => check.id === "scale-cache")?.status).toBe("pass");
    expect(review.checks.find((check) => check.id === "rel-edge")?.status).toBe("pass");
    expect(review.checks.every((check) => check.interviewer.length > 0)).toBe(true);
  });

  it("fails single points of failure and a missing cache on a read-heavy design", () => {
    const naive = design(
      [node("users", "client"), node("api", "api_server", { instances: 1 }), node("db", "postgresql", { readReplicas: 0 })],
      [
        ["users", "api"],
        ["api", "db"],
      ],
    );
    const { review } = runSimulation({ design: naive, failures: [] });
    const ids = review.checks.map((check) => `${check.id}:${check.status}`);
    expect(ids).toContain("rel-spof-api:fail");
    expect(ids).toContain("rel-spof-db:fail");
    expect(review.checks.find((check) => check.id === "scale-cache")?.status).toBe("warn");
    expect(review.checks.find((check) => check.id === "scale-stateless")?.status).toBe("warn");
    expect(review.grade).not.toBe("A");
    expect(review.summary).toContain("Fix first");
  });

  it("warns when a cold cache would overload the database", () => {
    const fragile = solid();
    const db = fragile.nodes.find((item) => item.id === "db");
    if (db) {
      db.config.readCapacity = 2_000;
      db.config.readReplicas = 1;
    }
    const { review } = runSimulation({ design: fragile, failures: [] });
    const stampede = review.checks.find((check) => check.id === "rel-stampede");
    expect(stampede?.status).toBe("warn");
    expect(stampede?.detail).toContain("thundering herd");
  });

  it("computes redundancy-based availability in series", () => {
    const single = availabilityEstimate([node("api", "api_server", { instances: 1 }), node("db", "postgresql", { readReplicas: 0 })]);
    const redundant = availabilityEstimate([node("api", "api_server", { instances: 3 }), node("db", "postgresql", { readReplicas: 2 })]);
    expect(single.total).toBeCloseTo(0.999 * 0.999, 6);
    expect(redundant.total).toBeGreaterThan(0.99999);
    expect(single.weakest?.availability).toBeCloseTo(0.999, 6);
    expect(redundant.weakest).toBeNull();
    expect(redundancyOf(node("cache", "redis", { replicas: 2 }))).toBe(3);
    expect(redundancyOf(node("events", "kafka", { replicationFactor: 3, brokers: 2 }))).toBe(2);
  });

  it("flags a write-bound primary and asks for a shard key", () => {
    const writeHeavy = design(
      [node("users", "client"), node("lb", "load_balancer"), node("api", "api_server", { instances: 40 }), node("db", "postgresql", { writeCapacity: 500, readReplicas: 2 })],
      [
        ["users", "lb"],
        ["lb", "api"],
        ["api", "db"],
      ],
    );
    const result = runSimulation({ design: writeHeavy, failures: [] });
    const check = result.review.checks.find((item) => item.id === "scale-writes-db");
    expect(check?.status).toBe("fail");
    expect(check?.interviewer).toContain("shard key");
    const bottleneck = result.bottlenecks.find((item) => item.nodeId === "db");
    expect(bottleneck?.metric).toBe("write");
    expect(bottleneck?.fix).toContain("sharding");
  });

  it("autoscales the API tier toward the CPU target and bills the scaled fleet", () => {
    const base = design(
      [node("users", "client"), node("lb", "load_balancer"), node("api", "api_server", { instances: 4, autoscaling: false }), node("db", "postgresql", { readReplicas: 2 })],
      [
        ["users", "lb"],
        ["lb", "api"],
        ["api", "db"],
      ],
    );
    const fixed = runSimulation({ design: base, failures: [] });
    const scaled = design(
      [node("users", "client"), node("lb", "load_balancer"), node("api", "api_server", { instances: 4, autoscaling: true, minInstances: 4, maxInstances: 200 }), node("db", "postgresql", { readReplicas: 2 })],
      [
        ["users", "lb"],
        ["lb", "api"],
        ["api", "db"],
      ],
    );
    const auto = runSimulation({ design: scaled, failures: [] });
    expect(fixed.nodes.api.health).toBe("overloaded");
    expect(["healthy", "warning"]).toContain(auto.nodes.api.health);
    expect(auto.nodes.api.utilization.rps).toBeGreaterThan(0.5);
    expect(auto.nodes.api.utilization.rps).toBeLessThanOrEqual(0.7);
    expect(auto.nodes.api.notes[0]).toMatch(/Autoscaled 4 → \d+ instances/);
    expect(auto.cost.total).toBeGreaterThan(fixed.cost.total);
    expect(auto.review.checks.find((check) => check.id === "req-errors")?.status).toBe("pass");
  });

  it("gives a numeric instance count for an overloaded API tier", () => {
    const thin = design(
      [node("users", "client"), node("lb", "load_balancer"), node("api", "api_server", { instances: 2 }), node("db", "postgresql", { readReplicas: 2 })],
      [
        ["users", "lb"],
        ["lb", "api"],
        ["api", "db"],
      ],
    );
    const result = runSimulation({ design: thin, failures: [] });
    const api = result.bottlenecks.find((item) => item.nodeId === "api");
    expect(api?.fix).toMatch(/Go from 2 to about \d+ instances/);
    expect(result.nodes.api.label).toBe("api");
  });
});
