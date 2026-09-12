import { applyQueueing, bool, num, str } from "../engine/queueing";
import type { Latency, Traffic } from "../models/types";
import { emptyTraffic, scaleTraffic } from "../models/types";
import { result, type ComponentKind, type InterviewNotes } from "./kind";
import { MORE_KINDS } from "./library-more";

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
  interview: {
    whenToUse: "Always. Start by naming who the users are (browser, mobile, other services) and how many are active at once.",
    tradeoffs: [
      "Mobile clients tolerate less latency variance and retry more aggressively than browsers.",
      "Thick clients can cache and batch, which lowers server load but complicates invalidation.",
    ],
    questions: [
      "How many daily active users, and what is the peak-to-average ratio?",
      "Is the read/write mix the same for every client type?",
    ],
  },
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
  interview: {
    whenToUse: "Any public system. Mention it once, then move on; it is rarely the interesting part unless you use it for geo-routing.",
    tradeoffs: [
      "Long TTLs cut lookups and latency but slow down failover to a new IP.",
      "Geo-DNS routes users to a nearby region but cannot see per-server health in real time.",
    ],
    questions: [
      "How do you fail over to another region if DNS caches the old address?",
      "Would you use DNS or anycast for multi-region routing?",
    ],
  },
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
  interview: {
    whenToUse: "As soon as you have more than one stateless server. It is what makes horizontal scaling possible.",
    tradeoffs: [
      "L4 is fast and dumb; L7 can route by path or header but costs CPU and terminates TLS.",
      "Least-connections handles uneven request cost; round-robin is simpler and fine when requests are uniform.",
      "Sticky sessions keep state on a server, which defeats the point of being stateless.",
    ],
    questions: [
      "How does the load balancer know a server is unhealthy, and how fast does it stop sending traffic?",
      "What happens if the load balancer itself fails?",
    ],
  },
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
  interview: {
    whenToUse: "Static assets, media, and any response many users share. Skip it for personalised or write-heavy paths.",
    tradeoffs: [
      "Push CDNs need you to upload; pull CDNs fetch on the first miss and serve stale for a TTL.",
      "Long TTLs mean cheap serving but slow updates; cache-busting URLs get both.",
      "Edge hits never touch your servers, so the hit ratio directly sets origin capacity.",
    ],
    questions: [
      "What is cacheable, and how do you invalidate when the underlying object changes?",
      "How do you keep private content from being cached at the edge?",
    ],
  },
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

/** Theoretical RPS one API instance can take before the safety factor: CPU-bound, concurrency-bound, or a manual cap. */
export function apiInstanceTheoreticalRps(config: Record<string, string | number | boolean>): number {
  const vcpu = num(config, "vcpu", 4);
  const avgMs = Math.max(1, num(config, "avgLatencyMs", 18));
  const cpuBound = (vcpu * 1000) / avgMs;
  const concBound = num(config, "maxConcurrency", 400) / (avgMs / 1000);
  const manual = num(config, "maxRps", 0);
  return Math.min(cpuBound, concBound, manual > 0 ? manual : Infinity);
}

export const API_SAFETY_FACTOR = 0.75;

/** Effective RPS per API instance, as the simulation and the estimate worksheet both use it. */
export function apiInstanceRps(config: Record<string, string | number | boolean>): number {
  return apiInstanceTheoreticalRps(config) * API_SAFETY_FACTOR;
}

/**
 * Instance count for this run. With autoscaling on, the fleet grows toward the scale-up CPU
 * target between min and max; otherwise it is whatever was configured.
 */
export function apiInstancesForLoad(config: Record<string, string | number | boolean>, incomingRps: number): { configured: number; instances: number; scaled: boolean; max: number; target: number } {
  const configured = Math.max(1, num(config, "instances", 8));
  const target = Math.min(0.95, Math.max(0.3, num(config, "scaleUpCpu", 70) / 100));
  if (!bool(config, "autoscaling", false)) return { configured, instances: configured, scaled: false, max: configured, target };
  const min = Math.max(1, num(config, "minInstances", configured));
  const max = Math.max(min, num(config, "maxInstances", configured));
  const needed = Math.ceil(incomingRps / Math.max(apiInstanceRps(config) * target, 1));
  const instances = Math.min(max, Math.max(min, needed));
  return { configured, instances, scaled: instances !== configured, max, target };
}

export const apiServerKind: ComponentKind = {
  type: "api_server",
  label: "API Server",
  category: "compute",
  description: "Stateless application tier. Capacity comes from CPU, concurrency, and instance count.",
  icon: "Server",
  defaultLabel: "API Servers",
  interview: {
    whenToUse: "The stateless tier that runs business logic. Keep no session state on it so any instance can serve any request.",
    tradeoffs: [
      "More small instances fail more gracefully than a few big ones, but cost more in overhead.",
      "Autoscaling on CPU lags a burst by minutes; a queue or over-provisioning absorbs the gap.",
      "Splitting into microservices isolates failures and teams but adds network hops and operational load.",
    ],
    questions: [
      "How many servers do you need at peak, and how did you get that number?",
      "What is the request-handling path from load balancer to database, step by step?",
    ],
  },
  defaultConfig: {
    instances: 8,
    vcpu: 4,
    memoryGb: 8,
    bandwidthMbps: 2000,
    avgLatencyMs: 18,
    p95LatencyMs: 40,
    maxConcurrency: 400,
    maxRps: 0,
    failureRate: 0.0005,
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
    const fleet = apiInstancesForLoad(config, incoming.rps);
    const instances = fleet.instances;
    const vcpu = num(config, "vcpu", 4);
    const avgMs = Math.max(1, num(config, "avgLatencyMs", 18));
    const cpuBound = (vcpu * 1000 * instances) / avgMs;
    const theoretical = apiInstanceTheoreticalRps(config) * instances;
    const effective = theoretical * API_SAFETY_FACTOR;
    const { processed, dropped, util } = saturate(incoming.rps, effective);
    const fail = processed * num(config, "failureRate", 0.0005);
    const cpu = incoming.rps / Math.max(cpuBound, 1);
    return result({
      effectiveConfig: fleet.scaled ? { instances } : undefined,
      processedRps: processed - fail,
      droppedRps: dropped + fail,
      latency: applyQueueing(latency(avgMs, num(config, "p95LatencyMs", 40), num(config, "p95LatencyMs", 40) * 1.7), Math.max(util, cpu)),
      utilization: { rps: util, cpu, memory: Math.min(0.95, 0.25 + cpu * 0.5) },
      outgoing: [
        { tag: "read", label: "reads", traffic: { ...passThrough(incoming, processed - fail), writeRps: 0, rps: ((processed - fail) * incoming.readRps) / Math.max(incoming.rps, 1) } },
        { tag: "write", label: "writes", traffic: { ...passThrough(incoming, processed - fail), readRps: 0, rps: ((processed - fail) * incoming.writeRps) / Math.max(incoming.rps, 1) } },
      ],
      notes: [
        fleet.scaled
          ? `Autoscaled ${fleet.configured} → ${instances} instances toward ${Math.round(fleet.target * 100)}% CPU (max ${fleet.max}).${instances >= fleet.max && util > fleet.target ? " Hit the ceiling; raise max instances." : ""}`
          : `${instances} instances.`,
        `Theoretical ${Math.round(theoretical).toLocaleString()} RPS → effective ${Math.round(effective).toLocaleString()} RPS (${API_SAFETY_FACTOR} safety).`,
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
    interview: {
      whenToUse: "Read-heavy paths with a hot working set: profiles, timelines, short-URL lookups, sessions, counters.",
      tradeoffs: [
        "Cache-aside is simple but the first read after a write is a miss; write-through keeps it warm but adds write latency.",
        "TTL-based expiry is easy and eventually consistent; explicit invalidation is precise and easy to get wrong.",
        "A cache that disappears sends its full load to the database, so treat its capacity as part of the database's.",
      ],
      questions: [
        "What is your eviction policy and why?",
        "How do you prevent a thundering herd when a hot key expires?",
        "What hit ratio are you assuming and what happens at half of it?",
      ],
    },
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
        notes: [
          hit <= 0
            ? `Cold or down: nothing is served from memory and all ${Math.round(misses).toLocaleString()} read RPS fall through to storage.`
            : `${Math.round(hit * 100)}% of reads stop here. ${Math.round(misses).toLocaleString()} RPS still hit storage.`,
        ],
      });
    },
  };
}

const DATABASE_NOTES: Record<"postgresql" | "mysql" | "nosql", InterviewNotes> = {
  postgresql: {
    whenToUse: "Relational data with transactions and joins: accounts, orders, anything where correctness beats raw write throughput.",
    tradeoffs: [
      "Read replicas scale reads almost linearly; writes still go to one primary until you shard.",
      "Async replication keeps writes fast but replicas can lag; sync replication removes data loss at the cost of write latency.",
      "Sharding by key spreads writes but makes cross-shard joins and transactions expensive.",
    ],
    questions: [
      "What is the shard key, and how do you handle a celebrity or hot partition?",
      "Do users read their own writes immediately? How, if replicas lag?",
    ],
  },
  mysql: {
    whenToUse: "Same territory as PostgreSQL: relational data with transactions. Pick one and say why; interviewers care about the shape, not the vendor.",
    tradeoffs: [
      "Read replicas scale reads; writes are bound by one primary until you shard.",
      "Async replication risks stale reads; semi-sync or sync trades write latency for durability.",
      "Sharding spreads writes but complicates joins, transactions, and re-balancing.",
    ],
    questions: [
      "How do you migrate the schema on a sharded fleet without downtime?",
      "What is the failover story when the primary dies?",
    ],
  },
  nosql: {
    whenToUse: "Very high write rates, simple key-based access, or data that does not fit a fixed schema: feeds, events, sessions, time series.",
    tradeoffs: [
      "Partition-native writes scale horizontally, but you give up joins and multi-row transactions.",
      "Quorum reads and writes tune consistency per request; leaderless replication means conflicts you must resolve.",
      "The partition key decides everything: a bad one creates hot partitions no amount of nodes fixes.",
    ],
    questions: [
      "Why NoSQL over a relational store here? What query pattern justifies it?",
      "How do you model a one-to-many relationship without joins?",
    ],
  },
};

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
    interview: DATABASE_NOTES[type],
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
      // Little's law: connections in flight = throughput × time each one is held.
      const heldSec = (reads * num(config, "readLatencyMs", defaults.readMs) + writes * num(config, "writeLatencyMs", defaults.writeMs)) / Math.max(1, incoming.rps) / 1000;
      const connUtil = (incoming.rps * heldSec) / Math.max(num(config, "maxConnections", 2000), 1);
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
        utilization: { read: readUtil, write: writeUtil, cpu: Math.min(peak * 0.9, 1.4), connections: connUtil, iops: iopsUtil },
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
  interview: {
    whenToUse: "Decoupling producers from consumers: events, notifications, analytics, fan-out, anything that can be processed slightly later.",
    tradeoffs: [
      "A log absorbs bursts and lets consumers fail independently, but adds eventual consistency and operational weight.",
      "Partitions set the ceiling on consumer parallelism; ordering is only guaranteed within one partition.",
      "At-least-once delivery is the default, so consumers must be idempotent.",
    ],
    questions: [
      "What is the partition key and does ordering matter for it?",
      "A consumer crashes mid-batch. Is the work redone, and is that safe?",
      "How do you know consumers are falling behind?",
    ],
  },
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
  simulate(config, incoming, context) {
    const produceCap = Math.min(
      num(config, "producerThroughput", 80_000),
      num(config, "brokers", 3) * num(config, "brokerCapacity", 40_000),
    );
    // With a consumer drawn downstream (workers, analytics), that node models the drain; the log only has to keep up with producers.
    const handsOff = context.outgoingEdges > 0;
    const consumerCap = handsOff
      ? produceCap
      : Math.min(
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
        handsOff
          ? `${Math.round(ingested).toLocaleString()} msg/s handed to the consumers drawn downstream; their capacity decides the lag.`
          : lagRate > 0
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
  interview: {
    whenToUse: "Images, video, files, backups, logs: anything large and immutable. Keep only the metadata and a pointer in the database.",
    tradeoffs: [
      "Practically unlimited and very durable, but per-object latency is tens of milliseconds and listing is slow.",
      "Pre-signed URLs let clients upload and download directly, taking the bytes off your API servers.",
      "Pair it with a CDN for reads; the bucket alone is not a fast serving tier.",
    ],
    questions: [
      "Do uploads go through your API or straight to the bucket?",
      "How do you handle a 2 GB upload that fails at 90%?",
    ],
  },
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
  interview: {
    whenToUse: "In front of any public API. It protects the system from abuse, retry storms, and one tenant starving the others.",
    tradeoffs: [
      "Token bucket allows bursts; sliding window is smoother but costs more memory per key.",
      "A shared counter store (Redis) gives global limits but adds a hop; local limits are fast but approximate.",
      "Reject with 429 and a Retry-After so well-behaved clients back off instead of hammering.",
    ],
    questions: [
      "Where does the limiter run: gateway, service, or both?",
      "How does it behave when its counter store is down: fail open or fail closed?",
    ],
  },
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
  ...MORE_KINDS,
];
