import { getKind } from "../components/registry";
import { num } from "./queueing";
import type { CostLine, DesignNode } from "../models/types";

export function costForNode(node: DesignNode): number {
  const c = node.config;
  switch (node.type) {
    case "client":
      return 0;
    case "dns":
      return 20;
    case "load_balancer":
      return 35 * num(c, "instances", 2);
    case "cdn":
      return 180;
    case "api_server":
      return 28 * num(c, "instances", 8) * Math.max(1, num(c, "vcpu", 4) / 2);
    case "redis":
      return 18 * num(c, "memoryGb", 32) + 40 * num(c, "replicas", 1);
    case "postgresql":
    case "mysql":
      return 220 + 22 * num(c, "vcpu", 8) + 0.12 * num(c, "storageGb", 2000) + 90 * num(c, "readReplicas", 2);
    case "nosql":
      return 260 + 18 * num(c, "vcpu", 8) + 0.15 * num(c, "storageGb", 2000);
    case "kafka":
      return 95 * num(c, "brokers", 3) + 4 * num(c, "partitions", 24);
    case "object_storage":
      return 23 * num(c, "capacityTb", 50);
    case "rate_limiter":
      return 40;
    default:
      return 25;
  }
}

export function estimateCost(nodes: DesignNode[]): { lines: CostLine[]; total: number } {
  const buckets = new Map<string, number>();
  for (const node of nodes) {
    const kind = getKind(node.type);
    const label =
      kind.category === "database"
        ? "Database"
        : kind.category === "compute"
          ? "Compute"
          : kind.category === "cache"
            ? "Cache"
            : kind.category === "messaging"
              ? "Kafka"
              : kind.category === "storage"
                ? "Storage"
                : kind.category === "networking"
                  ? node.type === "cdn"
                    ? "CDN"
                    : "Load Balancer"
                  : kind.label;
    buckets.set(label, (buckets.get(label) ?? 0) + costForNode(node));
  }
  const lines = [...buckets.entries()]
    .map(([label, monthly]) => ({ key: label, label, monthly }))
    .sort((a, b) => b.monthly - a.monthly);
  const network = nodes.some((node) => node.type === "api_server" || node.type === "cdn") ? 180 : 40;
  lines.push({ key: "network", label: "Network", monthly: network });
  return { lines, total: lines.reduce((sum, line) => sum + line.monthly, 0) };
}
