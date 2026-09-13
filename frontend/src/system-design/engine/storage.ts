import { num } from "./queueing";
import type { DesignNode, StorageBreakdown, WorkloadConfig } from "../models/types";

export function estimateStorage(nodes: DesignNode[], workload: WorkloadConfig): StorageBreakdown[] {
  return nodes
    .filter((node) => ["postgresql", "mysql", "nosql", "object_storage", "kafka", "redis", "search_index", "analytics_store"].includes(node.type))
    .map((node) => breakdown(node, workload));
}

function breakdown(node: DesignNode, workload: WorkloadConfig): StorageBreakdown {
  const c = node.config;
  if (node.type === "object_storage") {
    const dailyGb = (num(c, "objectsPerDay", 5_000_000) * num(c, "avgObjectKb", 256)) / 1_000_000;
    const raw = dailyGb * 30;
    const replica = raw * Math.max(1, num(c, "replication", 3));
    return {
      nodeId: node.id,
      label: node.label,
      rawGb: raw,
      indexGb: 0,
      replicaGb: replica,
      backupGb: raw * 0.2,
      compressedGb: replica,
      assumptions: [`${num(c, "objectsPerDay", 5_000_000).toLocaleString()} objects/day × ${num(c, "avgObjectKb", 256)} KB.`, "Monthly raw shown; yearly is ≈ 12× if growth is linear."],
    };
  }
  if (node.type === "kafka") {
    const gbHour = (num(c, "producerThroughput", 80_000) * num(c, "messageBytes", 1024) * 3600) / 1_000_000_000;
    const raw = gbHour * num(c, "retentionHours", 72);
    const replica = raw * num(c, "replicationFactor", 3);
    return {
      nodeId: node.id,
      label: node.label,
      rawGb: raw,
      indexGb: raw * 0.05,
      replicaGb: replica,
      backupGb: 0,
      compressedGb: replica * 0.8,
      assumptions: [`Retention ${num(c, "retentionHours", 72)}h at peak produce rate.`],
    };
  }
  if (node.type === "search_index") {
    const raw = (num(c, "documents", 100_000_000) * num(c, "docBytes", 1_000)) / 1_000_000_000;
    const index = raw * 0.4;
    const replica = (raw + index) * (1 + num(c, "replicas", 1));
    return {
      nodeId: node.id,
      label: node.label,
      rawGb: raw,
      indexGb: index,
      replicaGb: replica,
      backupGb: 0,
      compressedGb: replica,
      assumptions: [
        `${num(c, "documents", 100_000_000).toLocaleString()} docs × ${num(c, "docBytes", 1_000)} B, inverted index ≈ 40% on top, ${num(c, "replicas", 1)} replica${num(c, "replicas", 1) === 1 ? "" : "s"} per shard.`,
        "Derived data: rebuildable from the primary store, so no backups counted.",
      ],
    };
  }
  if (node.type === "analytics_store") {
    const raw = (num(c, "eventsPerDay", 100_000_000) * num(c, "eventBytes", 200) * num(c, "retentionDays", 90)) / 1_000_000_000;
    const replica = raw * Math.max(1, num(c, "replicationFactor", 2));
    const compressed = replica * num(c, "compression", 0.3);
    return {
      nodeId: node.id,
      label: node.label,
      rawGb: raw,
      indexGb: 0,
      replicaGb: replica,
      backupGb: 0,
      compressedGb: compressed,
      assumptions: [
        `${num(c, "eventsPerDay", 100_000_000).toLocaleString()} events/day × ${num(c, "eventBytes", 200)} B × ${num(c, "retentionDays", 90)} days retention.`,
        `Columnar compression ${num(c, "compression", 0.3)}×; retention is the cost lever.`,
      ],
    };
  }
  if (node.type === "redis") {
    return {
      nodeId: node.id,
      label: node.label,
      rawGb: num(c, "memoryGb", 32),
      indexGb: 0,
      replicaGb: num(c, "memoryGb", 32) * (1 + num(c, "replicas", 1)),
      backupGb: 0,
      compressedGb: num(c, "memoryGb", 32),
      assumptions: ["Working set is bounded by allocated memory, not by DAU."],
    };
  }
  const daily = num(c, "dailyGrowthGb", 40) * (1 + workload.trafficGrowth);
  const raw = num(c, "storageGb", 2000);
  const index = raw * num(c, "indexOverhead", 0.3);
  const replica = (raw + index) * Math.max(1, num(c, "replicationFactor", 2));
  const backup = (raw + index) * num(c, "backupOverhead", 0.5);
  const compressed = (replica + backup) * num(c, "compression", 0.7);
  return {
    nodeId: node.id,
    label: node.label,
    rawGb: raw,
    indexGb: index,
    replicaGb: replica,
    backupGb: backup,
    compressedGb: compressed,
    assumptions: [
      `Daily growth ≈ ${daily.toFixed(0)} GB including ${Math.round(workload.trafficGrowth * 100)}% traffic growth.`,
      `Indexes ${Math.round(num(c, "indexOverhead", 0.3) * 100)}%, backups ${Math.round(num(c, "backupOverhead", 0.5) * 100)}%, compression ${num(c, "compression", 0.7)}×.`,
    ],
  };
}
