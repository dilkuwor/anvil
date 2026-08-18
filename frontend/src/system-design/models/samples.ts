import type { SimulatorSample } from "@/lib/interview";
import { getKind } from "../components/registry";
import { uid } from "../utils/ids";
import type { ComponentType, DesignNode, Difficulty, SystemDesign } from "./types";
import { DEFAULT_SLO, DEFAULT_WORKLOAD } from "./workload";

export function designFromSample(sample: SimulatorSample): SystemDesign {
  const now = new Date().toISOString();
  return {
    id: uid("d"),
    name: sample.name,
    problemSlug: sample.slug,
    difficulty: (sample.difficulty as Difficulty) || "intermediate",
    createdAt: now,
    updatedAt: now,
    workload: {
      ...DEFAULT_WORKLOAD,
      dau: sample.workload.dau,
      concurrentUsers: sample.workload.concurrent_users,
      requestsPerUserDay: sample.workload.requests_per_user_day,
      readRatio: sample.workload.read_ratio,
      avgRequestBytes: sample.workload.avg_request_bytes,
      avgResponseBytes: sample.workload.avg_response_bytes,
      peakMultiplier: sample.workload.peak_multiplier,
      trafficGrowth: sample.workload.traffic_growth,
    },
    slo: {
      ...DEFAULT_SLO,
      availability: sample.slo.availability,
      p95Ms: sample.slo.p95_ms,
      p99Ms: sample.slo.p99_ms,
      errorRate: sample.slo.error_rate,
      rpoSeconds: sample.slo.rpo_seconds,
      rtoSeconds: sample.slo.rto_seconds,
    },
    nodes: sample.nodes.map((item) => hydrateNode(item)),
    edges: sample.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? undefined,
    })),
  };
}

function hydrateNode(item: SimulatorSample["nodes"][number]): DesignNode {
  const type = item.type as ComponentType;
  const kind = getKind(type);
  return {
    id: item.id,
    type,
    label: item.label,
    x: item.x,
    y: item.y,
    config: { ...kind.defaultConfig, ...item.config },
  };
}

export function sampleFromCatalog(
  items: { slug: string; sample_slug?: string | null; sample?: SimulatorSample | null }[] | undefined,
  slug: string | null | undefined,
): SimulatorSample | undefined {
  if (!items || !slug) return undefined;
  return items.find((item) => item.sample_slug === slug || item.slug === slug)?.sample ?? undefined;
}
