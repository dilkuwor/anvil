import { applyQueueing, num, str } from "../engine/queueing";
import type { Latency, Traffic } from "../models/types";
import { emptyTraffic, scaleTraffic } from "../models/types";
import { result, type ComponentKind } from "./kind";

function latency(p50: number, p95 = p50 * 1.8, p99 = p50 * 3): Latency {
  return { p50, p95, p99 };
}

function saturate(incoming: number, capacity: number): { processed: number; dropped: number; util: number } {
  const safe = Math.max(capacity, 1);
  const processed = Math.min(incoming, safe);
  return { processed, dropped: Math.max(0, incoming - processed), util: incoming / safe };
}

function passThrough(incoming: Traffic, processedRps: number): Traffic {
  if (incoming.rps <= 0) return emptyTraffic();
  return scaleTraffic(incoming, processedRps / incoming.rps);
}

export const clientKind: ComponentKind = {
  type: "client",
  label: "Users / Client",
  category: "clients",
  description: "Traffic source. Workload RPS enters the graph here.",
  icon: "Users",
  defaultLabel: "Users",
  defaultConfig: { regions: 1 },
  fields: [{ key: "regions", label: "Regions", kind: "number", tier: "intermediate", min: 1, max: 8 }],
  simulate(config, incoming) {
    void config;
    return result({
      processedRps: incoming.rps,
      latency: latency(8, 15, 30),
      utilization: { rps: 0.1 },
      outgoing: [{ tag: "default", label: "requests", traffic: incoming }],
      notes: ["Clients generate the configured workload."],
    });
  },
};

export const dnsKind: ComponentKind = {
  type: "dns",
  label: "DNS",
  category: "networking",
  description: "Name resolution in front of the edge.",
  icon: "Globe",
  defaultLabel: "DNS",
  defaultConfig: { qps: 100_000, ttlSec: 60, latencyMs: 4, availability: 99.99, healthChecks: true },
  fields: [
    { key: "qps", label: "Queries / sec", kind: "number", tier: "intermediate", min: 100 },
    { key: "ttlSec", label: "TTL", kind: "number", tier: "advanced", unit: "s", min: 1 },
    { key: "latencyMs", label: "Latency", kind: "number", tier: "beginner", unit: "ms", min: 1 },
    { key: "availability", label: "Availability", kind: "number", tier: "expert", unit: "%", min: 90, max: 100, step: 0.001 },
    { key: "healthChecks", label: "Health checks", kind: "boolean", tier: "advanced" },
  ],
  simulate(config, incoming) {
    const cap = num(config, "qps", 100_000);
    const { processed, dropped, util } = saturate(incoming.rps, cap);
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(num(config, "latencyMs", 4)), util),
      utilization: { rps: util },
      outgoing: [{ tag: "default", traffic: passThrough(incoming, processed) }],
    });
  },
};

export const loadBalancerKind: ComponentKind = {
  type: "load_balancer",
  label: "Load Balancer",
  category: "networking",
  description: "Spreads connections across API instances.",
  icon: "Scale",
  defaultLabel: "Load Balancer",
  defaultConfig: {
    instances: 2,
    maxRps: 50_000,
    maxConnections: 50_000,
    algorithm: "round_robin",
    timeoutMs: 2000,
    healthChecks: true,
    bandwidthMbps: 10_000,
    baseLatencyMs: 5,
    failureRate: 0.0001,
  },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 50 },
    { key: "maxRps", label: "Max RPS / instance", kind: "number", tier: "intermediate", min: 100 },
    { key: "maxConnections", label: "Max connections", kind: "number", tier: "advanced", min: 100 },
    {
      key: "algorithm",
      label: "Algorithm",
      kind: "select",
      tier: "intermediate",
      options: [
        { value: "round_robin", label: "Round Robin" },
        { value: "least_connections", label: "Least Connections" },
        { value: "weighted", label: "Weighted" },
        { value: "ip_hash", label: "IP Hash" },
      ],
    },
    { key: "timeoutMs", label: "Connection timeout", kind: "number", tier: "advanced", unit: "ms" },
    { key: "healthChecks", label: "Health checks", kind: "boolean", tier: "intermediate" },
    { key: "bandwidthMbps", label: "Bandwidth", kind: "number", tier: "advanced", unit: "Mbps" },
    { key: "baseLatencyMs", label: "Base latency", kind: "number", tier: "beginner", unit: "ms" },
    { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.0001 },
  ],
  simulate(config, incoming) {
    const instances = Math.max(1, num(config, "instances", 2));
    const cap = instances * num(config, "maxRps", 50_000) * 0.85;
    const { processed, dropped, util } = saturate(incoming.rps, cap);
    const fail = processed * num(config, "failureRate", 0.0001);
    return result({
      processedRps: processed - fail,
      droppedRps: dropped + fail,
      latency: applyQueueing(latency(num(config, "baseLatencyMs", 5)), util),
      utilization: { rps: util, connections: incoming.rps / Math.max(1, instances * num(config, "maxConnections", 50_000)) },
      outgoing: [{ tag: "default", traffic: passThrough(incoming, processed - fail) }],
      notes: [`Algorithm: ${str(config, "algorithm", "round_robin")}. Effective capacity ${Math.round(cap).toLocaleString()} RPS.`],
    });
  },
};

export const cdnKind: ComponentKind = {
  type: "cdn",
  label: "CDN",
  category: "networking",
  description: "Caches static and cacheable responses near users.",
  icon: "Cloud",
  defaultLabel: "CDN",
  defaultConfig: {
    hitRatio: 0.85,
    bandwidthMbps: 40_000,
    maxRps: 200_000,
    edgeLatencyMs: 20,
    originLatencyMs: 80,
    ttlSec: 300,
  },
  fields: [
    { key: "hitRatio", label: "Cache hit ratio", kind: "number", tier: "beginner", min: 0, max: 1, step: 0.01 },
    { key: "bandwidthMbps", label: "Bandwidth", kind: "number", tier: "advanced", unit: "Mbps" },
    { key: "maxRps", label: "Max requests / sec", kind: "number", tier: "intermediate" },
    { key: "edgeLatencyMs", label: "Edge latency", kind: "number", tier: "beginner", unit: "ms" },
    { key: "originLatencyMs", label: "Origin latency", kind: "number", tier: "intermediate", unit: "ms" },
    { key: "ttlSec", label: "TTL", kind: "number", tier: "advanced", unit: "s" },
  ],
  simulate(config, incoming) {
    const { processed, dropped, util } = saturate(incoming.rps, num(config, "maxRps", 200_000));
    const hit = num(config, "hitRatio", 0.85);
    const hits = processed * hit;
    const misses = processed * (1 - hit);
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(num(config, "edgeLatencyMs", 20)), util),
      utilization: { rps: util },
      outgoing: [
        { tag: "hit", label: "edge hits", traffic: scaleTraffic(incoming, hits / Math.max(incoming.rps, 1)) },
        { tag: "miss", label: "origin", traffic: scaleTraffic(incoming, misses / Math.max(incoming.rps, 1)) },
      ],
      notes: [`${Math.round(hit * 100)}% of reads stay at the edge.`],
    });
  },
};

export const apiServerKind: ComponentKind = {
  type: "api_server",
  label: "API Server",
  category: "compute",
  description: "Stateless application tier. Capacity comes from CPU, concurrency, and instance count.",
  icon: "Server",
  defaultLabel: "API Servers",
  defaultConfig: {
    instances: 8,
    vcpu: 4,
    memoryGb: 8,
    bandwidthMbps: 2000,
    avgLatencyMs: 18,
    p95LatencyMs: 40,
    maxConcurrency: 400,
    maxRps: 0,
    failureRate: 0.001,
    healthCheck: true,
    autoscaling: false,
    minInstances: 4,
    maxInstances: 40,
    scaleUpCpu: 70,
    scaleDownCpu: 30,
  },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 200 },
    { key: "vcpu", label: "vCPU / instance", kind: "number", tier: "intermediate", min: 1, max: 64 },
    { key: "memoryGb", label: "Memory / instance", kind: "number", tier: "intermediate", unit: "GB" },
    { key: "avgLatencyMs", label: "Avg processing", kind: "number", tier: "beginner", unit: "ms" },
    { key: "p95LatencyMs", label: "p95 processing", kind: "number", tier: "intermediate", unit: "ms" },
    { key: "maxConcurrency", label: "Max concurrency / instance", kind: "number", tier: "advanced" },
    { key: "maxRps", label: "Manual RPS cap (0 = auto)", kind: "number", tier: "expert" },
    { key: "bandwidthMbps", label: "NIC bandwidth", kind: "number", tier: "advanced", unit: "Mbps" },
    { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.0001 },
    { key: "autoscaling", label: "Autoscaling", kind: "boolean", tier: "intermediate" },
    { key: "minInstances", label: "Min instances", kind: "number", tier: "intermediate" },
    { key: "maxInstances", label: "Max instances", kind: "number", tier: "intermediate" },
    { key: "scaleUpCpu", label: "Scale-up CPU %", kind: "number", tier: "advanced" },
    { key: "scaleDownCpu", label: "Scale-down CPU %", kind: "number", tier: "advanced" },
  ],
  simulate(config, incoming) {
    const instances = Math.max(1, num(config, "instances", 8));
    const vcpu = num(config, "vcpu", 4);
    const avgMs = Math.max(1, num(config, "avgLatencyMs", 18));
    const cpuBound = (vcpu * 1000 * instances) / avgMs;
    const concBound = (num(config, "maxConcurrency", 400) / (avgMs / 1000)) * instances;
    const manual = num(config, "maxRps", 0);
    const theoretical = Math.min(cpuBound, concBound, manual > 0 ? manual * instances : Infinity);
    const effective = theoretical * 0.75;
    const { processed, dropped, util } = saturate(incoming.rps, effective);
    const fail = processed * num(config, "failureRate", 0.001);
    const cpu = incoming.rps / Math.max(cpuBound, 1);
    return result({
      processedRps: processed - fail,
      droppedRps: dropped + fail,
      latency: applyQueueing(latency(avgMs, num(config, "p95LatencyMs", 40), num(config, "p95LatencyMs", 40) * 1.7), Math.max(util, cpu)),
      utilization: { rps: util, cpu, memory: Math.min(0.95, 0.25 + cpu * 0.5) },
      outgoing: [
        { tag: "read", label: "reads", traffic: { ...passThrough(incoming, processed - fail), writeRps: 0, rps: ((processed - fail) * incoming.readRps) / Math.max(incoming.rps, 1) } },
        { tag: "write", label: "writes", traffic: { ...passThrough(incoming, processed - fail), readRps: 0, rps: ((processed - fail) * incoming.writeRps) / Math.max(incoming.rps, 1) } },
      ],
      notes: [
        `Theoretical ${Math.round(theoretical).toLocaleString()} RPS → effective ${Math.round(effective).toLocaleString()} RPS (0.75 safety).`,
      ],
    });
  },
};

function cacheKind(type: "redis", label: string): ComponentKind {
  return {
    type,
    label,
    category: "cache",
    description: "In-memory cache. Hits never reach the database.",
    icon: "Zap",
    defaultLabel: "Redis",
    defaultConfig: {
      memoryGb: 32,
      maxOps: 120_000,
      readLatencyMs: 1.5,
      writeLatencyMs: 2.5,
      hitRatio: 0.9,
      ttlSec: 300,
      eviction: "lru",
      bandwidthMbps: 5000,
      replicas: 1,
      failureRate: 0.0005,
    },
    fields: [
      { key: "memoryGb", label: "Memory", kind: "number", tier: "beginner", unit: "GB" },
      { key: "maxOps", label: "Max ops / sec", kind: "number", tier: "intermediate" },
      { key: "readLatencyMs", label: "Read latency", kind: "number", tier: "beginner", unit: "ms", step: 0.1 },
      { key: "writeLatencyMs", label: "Write latency", kind: "number", tier: "intermediate", unit: "ms", step: 0.1 },
      { key: "hitRatio", label: "Hit ratio", kind: "number", tier: "beginner", min: 0, max: 1, step: 0.01 },
      { key: "ttlSec", label: "TTL", kind: "number", tier: "intermediate", unit: "s" },
      {
        key: "eviction",
        label: "Eviction",
        kind: "select",
        tier: "advanced",
        options: [
          { value: "lru", label: "LRU" },
          { value: "lfu", label: "LFU" },
          { value: "ttl", label: "TTL" },
        ],
      },
      { key: "bandwidthMbps", label: "Bandwidth", kind: "number", tier: "advanced", unit: "Mbps" },
      { key: "replicas", label: "Replicas", kind: "number", tier: "intermediate", min: 0, max: 5 },
      { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.0001 },
    ],
    simulate(config, incoming) {
      const cap = num(config, "maxOps", 120_000);
      const { processed, dropped, util } = saturate(incoming.rps, cap);
      const hit = num(config, "hitRatio", 0.9);
      const reads = incoming.readRps || processed;
      const hits = Math.min(processed, reads) * hit;
      const misses = Math.min(processed, reads) * (1 - hit);
      const writes = Math.max(0, processed - reads);
      return result({
        processedRps: processed,
        droppedRps: dropped,
        latency: applyQueueing(latency(num(config, "readLatencyMs", 1.5), num(config, "writeLatencyMs", 2.5) * 1.4), util),
        utilization: { rps: util, memory: 0.45 + (1 - hit) * 0.2 },
        outgoing: [
          { tag: "hit", label: "hits", traffic: scaleTraffic(incoming, hits / Math.max(incoming.rps, 1)) },
          { tag: "miss", label: "misses", traffic: scaleTraffic(incoming, misses / Math.max(incoming.rps, 1)) },
          { tag: "write", label: "writes", traffic: scaleTraffic(incoming, writes / Math.max(incoming.rps, 1)) },
        ],
        notes: [`${Math.round(hit * 100)}% of reads stop here. ${Math.round(misses).toLocaleString()} RPS still hit storage.`],
      });
    },
  };
}

function databaseKind(
  type: "postgresql" | "mysql" | "nosql",
  label: string,
  defaults: { read: number; write: number; readMs: number; writeMs: number },
): ComponentKind {
  return {
    type,
    label,
    category: "database",
    description: "Durable store. Writes go to the primary; reads can use replicas.",
    icon: "Database",
    defaultLabel: label,
    defaultConfig: {
      vcpu: 8,
      memoryGb: 32,
      storageGb: 2000,
      readCapacity: defaults.read,
      writeCapacity: defaults.write,
      readLatencyMs: defaults.readMs,
      writeLatencyMs: defaults.writeMs,
      maxConnections: 2000,
      iops: 12_000,
      replication: type === "nosql" ? "quorum" : "async",
      replicationFactor: type === "nosql" ? 3 : 2,
      readReplicas: type === "nosql" ? 0 : 2,
      dailyGrowthGb: 40,
      indexOverhead: 0.3,
      backupOverhead: 0.5,
      compression: 0.7,
      failureRate: 0.0002,
      role: "primary",
    },
    fields: [
      { key: "vcpu", label: "vCPU", kind: "number", tier: "beginner", min: 2 },
      { key: "memoryGb", label: "Memory", kind: "number", tier: "beginner", unit: "GB" },
      { key: "storageGb", label: "Storage", kind: "number", tier: "beginner", unit: "GB" },
      { key: "readCapacity", label: "Read capacity", kind: "number", tier: "intermediate", unit: "RPS" },
      { key: "writeCapacity", label: "Write capacity", kind: "number", tier: "intermediate", unit: "WPS" },
      { key: "readLatencyMs", label: "Read latency", kind: "number", tier: "beginner", unit: "ms" },
      { key: "writeLatencyMs", label: "Write latency", kind: "number", tier: "beginner", unit: "ms" },
      { key: "readReplicas", label: "Read replicas", kind: "number", tier: "beginner", min: 0, max: 20 },
      { key: "maxConnections", label: "Max connections", kind: "number", tier: "advanced" },
      { key: "iops", label: "IOPS", kind: "number", tier: "advanced" },
      {
        key: "replication",
        label: "Replication",
        kind: "select",
        tier: "advanced",
        options: [
          { value: "async", label: "Async" },
          { value: "sync", label: "Sync" },
          { value: "quorum", label: "Quorum" },
        ],
      },
      { key: "replicationFactor", label: "Replication factor", kind: "number", tier: "advanced", min: 1, max: 7 },
      { key: "dailyGrowthGb", label: "Daily growth", kind: "number", tier: "intermediate", unit: "GB" },
      { key: "indexOverhead", label: "Index overhead", kind: "number", tier: "expert", min: 0, max: 2, step: 0.05 },
      { key: "backupOverhead", label: "Backup overhead", kind: "number", tier: "expert", min: 0, max: 3, step: 0.05 },
      { key: "compression", label: "Compression", kind: "number", tier: "expert", min: 0.2, max: 1, step: 0.05 },
      { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.0001 },
    ],
    simulate(config, incoming) {
      const replicas = num(config, "readReplicas", 2);
      const readCap = num(config, "readCapacity", defaults.read) * (1 + replicas * 0.85);
      const writeCap = num(config, "writeCapacity", defaults.write);
      const reads = incoming.readRps || incoming.rps * 0.8;
      const writes = incoming.writeRps || incoming.rps * 0.2;
      const readUtil = reads / Math.max(readCap, 1);
      const writeUtil = writes / Math.max(writeCap, 1);
      const connUtil = incoming.rps / Math.max(num(config, "maxConnections", 2000), 1);
      const iopsUtil = incoming.rps / Math.max(num(config, "iops", 12_000), 1);
      const readDrop = Math.max(0, reads - readCap);
      const writeDrop = Math.max(0, writes - writeCap);
      const processed = incoming.rps - readDrop - writeDrop;
      const peak = Math.max(readUtil, writeUtil, connUtil, iopsUtil);
      const fail = processed * num(config, "failureRate", 0.0002);
      const lat = applyQueueing(
        latency(
          writes > reads ? num(config, "writeLatencyMs", defaults.writeMs) : num(config, "readLatencyMs", defaults.readMs),
          num(config, "writeLatencyMs", defaults.writeMs) * 1.6,
        ),
        peak,
      );
      return result({
        processedRps: Math.max(0, processed - fail),
        droppedRps: readDrop + writeDrop + fail,
        latency: lat,
        utilization: { cpu: Math.min(peak * 0.9, 1.4), connections: connUtil, iops: iopsUtil, rps: peak },
        outgoing: [{ tag: "default", traffic: passThrough(incoming, Math.max(0, processed - fail)) }],
        notes: [
          `Reads ${Math.round(reads).toLocaleString()} / ${Math.round(readCap).toLocaleString()} with ${replicas} replicas.`,
          `Writes ${Math.round(writes).toLocaleString()} / ${Math.round(writeCap).toLocaleString()} on the primary.`,
        ],
      });
    },
  };
}

export const kafkaKind: ComponentKind = {
  type: "kafka",
  label: "Kafka",
  category: "messaging",
  description: "Durable log. Producers and consumers can run at different rates; the difference is lag.",
  icon: "Radio",
  defaultLabel: "Kafka",
  defaultConfig: {
    brokers: 3,
    partitions: 24,
    replicationFactor: 3,
    producerThroughput: 80_000,
    consumerThroughput: 60_000,
    messageBytes: 1024,
    retentionHours: 72,
    brokerCapacity: 40_000,
    bandwidthMbps: 10_000,
    consumers: 12,
    consumerMs: 8,
  },
  fields: [
    { key: "brokers", label: "Brokers", kind: "number", tier: "beginner", min: 1, max: 30 },
    { key: "partitions", label: "Partitions", kind: "number", tier: "intermediate", min: 1 },
    { key: "replicationFactor", label: "Replication factor", kind: "number", tier: "intermediate", min: 1, max: 7 },
    { key: "producerThroughput", label: "Producer capacity", kind: "number", tier: "intermediate", unit: "msg/s" },
    { key: "consumerThroughput", label: "Consumer capacity", kind: "number", tier: "intermediate", unit: "msg/s" },
    { key: "messageBytes", label: "Message size", kind: "number", tier: "advanced", unit: "B" },
    { key: "retentionHours", label: "Retention", kind: "number", tier: "advanced", unit: "h" },
    { key: "brokerCapacity", label: "Per-broker capacity", kind: "number", tier: "advanced", unit: "msg/s" },
    { key: "consumers", label: "Consumers", kind: "number", tier: "beginner", min: 1 },
    { key: "consumerMs", label: "Consumer processing", kind: "number", tier: "intermediate", unit: "ms" },
  ],
  simulate(config, incoming) {
    const produceCap = Math.min(
      num(config, "producerThroughput", 80_000),
      num(config, "brokers", 3) * num(config, "brokerCapacity", 40_000),
    );
    const consumerCap = Math.min(
      num(config, "consumerThroughput", 60_000),
      (num(config, "consumers", 12) * 1000) / Math.max(1, num(config, "consumerMs", 8)),
    );
    const ingested = Math.min(incoming.rps, produceCap);
    const produceDrop = Math.max(0, incoming.rps - produceCap);
    const consumed = Math.min(ingested, consumerCap);
    const lagRate = ingested - consumed;
    const util = Math.max(ingested / Math.max(produceCap, 1), consumed / Math.max(consumerCap, 1));
    return result({
      processedRps: consumed,
      droppedRps: produceDrop,
      latency: applyQueueing(latency(6, 18, 40), util),
      utilization: { produce: ingested / Math.max(produceCap, 1), consume: ingested / Math.max(consumerCap, 1), partitions: num(config, "consumers", 12) / Math.max(num(config, "partitions", 24), 1) },
      outgoing: [{ tag: "async", label: "consumers", traffic: scaleTraffic(incoming, consumed / Math.max(incoming.rps, 1)) }],
      notes: [
        lagRate > 0
          ? `Backlog grows by ${Math.round(lagRate).toLocaleString()} msg/s. One minute of this is ${Math.round(lagRate * 60).toLocaleString()} messages.`
          : "Consumers keep up with producers.",
      ],
    });
  },
};

export const objectStorageKind: ComponentKind = {
  type: "object_storage",
  label: "Object Storage",
  category: "storage",
  description: "S3-like blob store. Cheap capacity, pay for requests and bandwidth.",
  icon: "HardDrive",
  defaultLabel: "Object Storage",
  defaultConfig: {
    capacityTb: 50,
    avgObjectKb: 256,
    objectsPerDay: 5_000_000,
    readRps: 8_000,
    writeRps: 1_200,
    replication: 3,
    durability: 11,
  },
  fields: [
    { key: "capacityTb", label: "Capacity", kind: "number", tier: "beginner", unit: "TB" },
    { key: "avgObjectKb", label: "Avg object size", kind: "number", tier: "intermediate", unit: "KB" },
    { key: "objectsPerDay", label: "New objects / day", kind: "number", tier: "intermediate" },
    { key: "readRps", label: "Read capacity", kind: "number", tier: "intermediate", unit: "RPS" },
    { key: "writeRps", label: "Write capacity", kind: "number", tier: "intermediate", unit: "WPS" },
    { key: "replication", label: "Replication", kind: "number", tier: "advanced", min: 1, max: 6 },
    { key: "durability", label: "Durability nines", kind: "number", tier: "expert", min: 9, max: 12 },
  ],
  simulate(config, incoming) {
    const readCap = num(config, "readRps", 8_000);
    const writeCap = num(config, "writeRps", 1_200);
    const reads = incoming.readRps || incoming.rps * 0.8;
    const writes = incoming.writeRps || incoming.rps * 0.2;
    const drop = Math.max(0, reads - readCap) + Math.max(0, writes - writeCap);
    const util = Math.max(reads / Math.max(readCap, 1), writes / Math.max(writeCap, 1));
    return result({
      processedRps: incoming.rps - drop,
      droppedRps: drop,
      latency: applyQueueing(latency(25, 60, 120), util),
      utilization: { read: reads / Math.max(readCap, 1), write: writes / Math.max(writeCap, 1) },
      outgoing: [],
      notes: [`${num(config, "durability", 11)} nines durability. Growth is in the Storage tab.`],
    });
  },
};

export const rateLimiterKind: ComponentKind = {
  type: "rate_limiter",
  label: "Rate Limiter",
  category: "reliability",
  description: "Rejects traffic above a configured rate. Burst is allowed only for token/leaky bucket.",
  icon: "Shield",
  defaultLabel: "Rate Limiter",
  defaultConfig: {
    limitRps: 20_000,
    burst: 5_000,
    algorithm: "token_bucket",
    storage: "redis",
    latencyMs: 1,
  },
  fields: [
    { key: "limitRps", label: "Limit", kind: "number", tier: "beginner", unit: "RPS" },
    { key: "burst", label: "Burst", kind: "number", tier: "intermediate" },
    {
      key: "algorithm",
      label: "Algorithm",
      kind: "select",
      tier: "intermediate",
      options: [
        { value: "token_bucket", label: "Token Bucket" },
        { value: "leaky_bucket", label: "Leaky Bucket" },
        { value: "fixed_window", label: "Fixed Window" },
        { value: "sliding_window", label: "Sliding Window" },
      ],
    },
    { key: "storage", label: "Counter store", kind: "text", tier: "advanced" },
    { key: "latencyMs", label: "Added latency", kind: "number", tier: "beginner", unit: "ms" },
  ],
  simulate(config, incoming) {
    const limit = num(config, "limitRps", 20_000);
    const burst = str(config, "algorithm", "token_bucket").includes("window") ? 0 : num(config, "burst", 5_000);
    const allowed = Math.min(incoming.rps, limit + burst * 0.1);
    const rejected = Math.max(0, incoming.rps - allowed);
    return result({
      processedRps: allowed,
      rejectedRps: rejected,
      latency: latency(num(config, "latencyMs", 1), 2, 4),
      utilization: { rps: incoming.rps / Math.max(limit, 1) },
      outgoing: [{ tag: "default", traffic: passThrough(incoming, allowed) }],
      notes: rejected > 0 ? [`${Math.round(rejected).toLocaleString()} RPS rejected by ${str(config, "algorithm", "token_bucket")}.`] : [],
    });
  },
};

export const ALL_KINDS: ComponentKind[] = [
  clientKind,
  dnsKind,
  loadBalancerKind,
  cdnKind,
  apiServerKind,
  cacheKind("redis", "Redis"),
  databaseKind("postgresql", "PostgreSQL", { read: 25_000, write: 8_000, readMs: 8, writeMs: 15 }),
  databaseKind("mysql", "MySQL", { read: 22_000, write: 7_000, readMs: 9, writeMs: 16 }),
  databaseKind("nosql", "NoSQL", { read: 40_000, write: 15_000, readMs: 5, writeMs: 8 }),
  kafkaKind,
  objectStorageKind,
  rateLimiterKind,
];
