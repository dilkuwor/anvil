import { getKind } from "../components/registry";
import { uid } from "../utils/ids";
import type { ComponentType, ConfigValue, DesignNode, SystemDesign } from "./types";
import { DEFAULT_SLO } from "./workload";

export type SampleDesign = {
  slug: string;
  title: string;
  summary: string;
  build: () => SystemDesign;
};

function node(
  id: string,
  type: ComponentType,
  label: string,
  x: number,
  y: number,
  config: Record<string, ConfigValue> = {},
): DesignNode {
  const kind = getKind(type);
  return { id, type, label, x, y, config: { ...kind.defaultConfig, ...config } };
}

/** Classic read-heavy shortener: DNS → limiter → LB → API → Redis + Postgres, Kafka for clicks. */
export function buildUrlShortenerSample(): SystemDesign {
  const now = new Date().toISOString();
  return {
    id: uid("d"),
    name: "URL Shortener",
    problemSlug: "url-shortener",
    difficulty: "intermediate",
    createdAt: now,
    updatedAt: now,
    workload: {
      dau: 20_000_000,
      concurrentUsers: 80_000,
      requestsPerUserDay: 8,
      readRatio: 0.92,
      avgRequestBytes: 400,
      avgResponseBytes: 800,
      peakMultiplier: 5,
      trafficGrowth: 0.25,
    },
    slo: { ...DEFAULT_SLO, p95Ms: 200, p99Ms: 400, errorRate: 0.001, availability: 0.9999 },
    nodes: [
      node("users", "client", "Users", 40, 220),
      node("dns", "dns", "DNS", 250, 220, { latencyMs: 3, qps: 200_000 }),
      node("limiter", "rate_limiter", "Rate Limiter", 460, 220, { limitRps: 40_000, burst: 8_000, algorithm: "token_bucket" }),
      node("lb", "load_balancer", "Load Balancer", 680, 220, { instances: 3, maxRps: 40_000, algorithm: "least_connections" }),
      node("api", "api_server", "Redirect API", 900, 220, {
        instances: 16,
        vcpu: 4,
        avgLatencyMs: 12,
        p95LatencyMs: 28,
        autoscaling: true,
        minInstances: 8,
        maxInstances: 48,
      }),
      node("cache", "redis", "Redis", 1160, 80, { memoryGb: 64, hitRatio: 0.92, maxOps: 200_000, replicas: 1 }),
      node("db", "postgresql", "Links DB", 1160, 240, {
        vcpu: 8,
        storageGb: 1500,
        readCapacity: 20_000,
        writeCapacity: 6_000,
        readReplicas: 2,
        dailyGrowthGb: 12,
      }),
      node("analytics", "kafka", "Click Events", 1160, 420, {
        brokers: 3,
        partitions: 18,
        consumers: 8,
        producerThroughput: 40_000,
        consumerThroughput: 30_000,
      }),
    ],
    edges: [
      { id: "e-users-dns", source: "users", target: "dns" },
      { id: "e-dns-rl", source: "dns", target: "limiter" },
      { id: "e-rl-lb", source: "limiter", target: "lb" },
      { id: "e-lb-api", source: "lb", target: "api" },
      { id: "e-api-redis", source: "api", target: "cache" },
      { id: "e-api-db", source: "api", target: "db" },
      { id: "e-api-kafka", source: "api", target: "analytics" },
    ],
  };
}

export const SAMPLE_DESIGNS: SampleDesign[] = [
  {
    slug: "url-shortener",
    title: "URL Shortener",
    summary: "Users → DNS → rate limit → LB → API, with Redis on the redirect path, Postgres for writes, and Kafka for clicks.",
    build: buildUrlShortenerSample,
  },
];

export function getSample(slug: string): SampleDesign | undefined {
  return SAMPLE_DESIGNS.find((item) => item.slug === slug);
}
