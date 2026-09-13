import { describe, expect, it } from "vitest";

import type { ComponentType, DesignNode, SystemDesign } from "../models/types";
import { runSimulation } from "../engine/run";
import { getKind, kindsByCategory, listKinds } from "./registry";

function node(id: string, type: ComponentType, config: Record<string, string | number | boolean> = {}): DesignNode {
  return { id, type, label: id, x: 0, y: 0, config: { ...getKind(type).defaultConfig, ...config } };
}

function design(nodes: DesignNode[], edges: [string, string][], concurrentUsers = 200_000): SystemDesign {
  const now = "2026-08-18T00:00:00.000Z";
  return {
    id: "d1",
    name: "Chat",
    nodes,
    edges: edges.map(([source, target]) => ({ id: `${source}-${target}`, source, target })),
    workload: {
      dau: 5_000_000,
      concurrentUsers,
      requestsPerUserDay: 40,
      readRatio: 0.5,
      avgRequestBytes: 300,
      avgResponseBytes: 600,
      peakMultiplier: 3,
      trafficGrowth: 0.2,
    },
    slo: { availability: 0.999, p95Ms: 300, p99Ms: 800, errorRate: 0.01, rpoSeconds: 60, rtoSeconds: 300 },
    difficulty: "intermediate",
    createdAt: now,
    updatedAt: now,
  };
}

/** Users → WS gateway → API → task queue → workers → DB, with search, push, and an ID generator on the side. */
function chat(overrides: Partial<Record<string, Record<string, string | number | boolean>>> = {}, concurrentUsers = 200_000) {
  return design(
    [
      node("users", "client"),
      node("ws", "websocket_gateway", { instances: 8, ...overrides.ws }),
      node("api", "api_server", { instances: 40 }),
      node("ids", "id_generator", overrides.ids),
      node("queue", "task_queue", overrides.queue),
      node("workers", "worker", { instances: 10, ...overrides.workers }),
      node("db", "nosql", { replicationFactor: 3 }),
      node("search", "search_index", overrides.search),
      node("push", "notification_gateway", overrides.push),
    ],
    [
      ["users", "ws"],
      ["ws", "api"],
      ["api", "ids"],
      ["api", "queue"],
      ["api", "search"],
      ["queue", "workers"],
      ["workers", "db"],
      ["workers", "push"],
    ],
    concurrentUsers,
  );
}

describe("extended component library", () => {
  it("registers every new kind with interview notes and a palette category", () => {
    const types = listKinds().map((kind) => kind.type);
    for (const type of ["api_gateway", "websocket_gateway", "worker", "task_queue", "search_index", "geo_index", "id_generator", "analytics_store", "scheduler", "notification_gateway"]) {
      expect(types).toContain(type);
      const kind = getKind(type as ComponentType);
      expect(kind.interview.tradeoffs.length).toBeGreaterThan(1);
      expect(kind.interview.questions.length).toBeGreaterThan(0);
    }
    const categories = kindsByCategory().map((group) => group.category);
    expect(categories).toContain("search");
    expect(categories).toContain("coordination");
  });

  it("routes traffic through the async path: queue → workers → store and push", () => {
    const result = runSimulation({ design: chat(), failures: [] });
    const api = result.nodes.api;
    expect(result.nodes.queue.incomingRps).toBeCloseTo(api.processedRps * 0.5, 0);
    expect(result.nodes.workers.incomingRps).toBeCloseTo(result.nodes.queue.processedRps, 5);
    expect(result.nodes.db.incomingRps).toBeGreaterThan(0);
    expect(result.nodes.push.incomingRps).toBeCloseTo(result.nodes.workers.processedRps, 5);
    expect(result.nodes.ids.incomingRps).toBeCloseTo(api.processedRps * 0.5, 0);
    expect(result.nodes.search.incomingRps).toBeCloseTo(api.processedRps * 0.5, 0);
    expect(result.review.checks.find((check) => check.id === "scale-consumers")?.status).toBe("pass");
    expect(result.review.checks.find((check) => check.id === "scale-connections")?.status).toBe("pass");
  });

  it("fails the connection check when the gateway tier cannot hold every concurrent user", () => {
    const result = runSimulation({ design: chat({ ws: { instances: 2, maxConnections: 20_000 } }, 500_000), failures: [] });
    const check = result.review.checks.find((item) => item.id === "scale-connections");
    expect(check?.status).toBe("fail");
    expect(result.nodes.ws.utilization.connections).toBeGreaterThan(1);
    expect(result.nodes.ws.droppedRps).toBeGreaterThan(0);
    const bottleneck = result.bottlenecks.find((item) => item.nodeId === "ws");
    expect(bottleneck?.fix).toContain("hold the connections");
  });

  it("warns about a queue nobody consumes", () => {
    const orphan = design(
      [node("users", "client"), node("api", "api_server", { instances: 40 }), node("queue", "task_queue"), node("db", "postgresql", { readReplicas: 1 })],
      [
        ["users", "api"],
        ["api", "queue"],
        ["api", "db"],
      ],
    );
    const result = runSimulation({ design: orphan, failures: [] });
    const check = result.review.checks.find((item) => item.id === "scale-consumers");
    expect(check?.status).toBe("warn");
    expect(check?.detail).toContain("queue");
  });

  it("grows a backlog when workers are too slow and sizes the fix in instances", () => {
    const result = runSimulation({ design: chat({ workers: { instances: 1, concurrency: 4, jobMs: 200 } }), failures: [] });
    const workers = result.nodes.workers;
    expect(workers.droppedRps).toBeGreaterThan(0);
    expect(workers.notes[1]).toContain("Backlog grows");
    const lag = result.review.checks.find((item) => item.id === "rel-lag-workers");
    expect(lag?.status).toBe("fail");
    expect(result.bottlenecks.find((item) => item.nodeId === "workers")?.fix).toMatch(/Go from 1 to about \d+ instances to drain the queue/);
  });

  it("treats async components as off the availability path and single instances as SPOFs", () => {
    const result = runSimulation({ design: chat({ ids: { instances: 1 } }), failures: [] });
    const ids = result.review.checks.find((item) => item.id === "rel-spof-ids");
    expect(ids?.status).toBe("fail");
    expect(ids?.detail).toContain("every write stops");
    expect(result.review.checks.some((item) => item.id === "rel-spof-push")).toBe(false);
    expect(result.review.checks.some((item) => item.id === "rel-spof-queue")).toBe(false);
  });

  it("lets a scheduler generate its own jobs into a queue", () => {
    const crawler = design(
      [node("cron", "scheduler", { jobsPerSec: 500 }), node("queue", "task_queue"), node("workers", "worker", { instances: 20 }), node("db", "postgresql", { readReplicas: 1 })],
      [
        ["cron", "queue"],
        ["queue", "workers"],
        ["workers", "db"],
      ],
    );
    const result = runSimulation({ design: crawler, failures: [] });
    expect(result.nodes.queue.incomingRps).toBe(500);
    expect(result.nodes.workers.incomingRps).toBe(500);
    const noLeader = runSimulation({ design: { ...crawler, nodes: crawler.nodes.map((item) => (item.id === "cron" ? { ...item, config: { ...item.config, leaderElection: false, instances: 2 } } : item)) }, failures: [] });
    expect(noLeader.nodes.queue.incomingRps).toBe(1000);
  });

  it("throttles at the notification provider and sizes analytics storage by retention", () => {
    const heavy = design(
      [node("users", "client"), node("api", "api_server", { instances: 60 }), node("events", "kafka", { producerThroughput: 500_000, consumerThroughput: 500_000, brokers: 12 }), node("push", "notification_gateway", { providerRateLimit: 10, batchSize: 1 }), node("clicks", "analytics_store", { retentionDays: 30, eventsPerDay: 1_000_000_000 })],
      [
        ["users", "api"],
        ["api", "push"],
        ["api", "events"],
        ["events", "clicks"],
      ],
    );
    const result = runSimulation({ design: heavy, failures: [] });
    expect(result.nodes.push.rejectedRps).toBeGreaterThan(0);
    expect(result.nodes.clicks.incomingRps).toBeGreaterThan(0);
    const storage = result.storage.find((item) => item.nodeId === "clicks");
    expect(storage?.rawGb).toBeCloseTo(6000, 0);
    expect(result.cost.lines.some((line) => line.label === "Search & Analytics")).toBe(true);
  });
});
