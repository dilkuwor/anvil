export type ComponentType =
  | "client"
  | "dns"
  | "load_balancer"
  | "cdn"
  | "api_server"
  | "redis"
  | "postgresql"
  | "mysql"
  | "nosql"
  | "kafka"
  | "object_storage"
  | "rate_limiter";

export type ComponentCategory =
  | "clients"
  | "networking"
  | "compute"
  | "cache"
  | "database"
  | "messaging"
  | "storage"
  | "reliability";

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type FieldTier = Difficulty;

export type ConfigValue = string | number | boolean;

export type Traffic = {
  rps: number;
  readRps: number;
  writeRps: number;
  bytesInPerSec: number;
  bytesOutPerSec: number;
};

export type Latency = {
  p50: number;
  p95: number;
  p99: number;
};

export type Health = "healthy" | "warning" | "critical" | "overloaded";

export type UtilizationMap = Record<string, number>;

export type OutgoingTag = "default" | "read" | "write" | "hit" | "miss" | "async";

export type OutgoingFlow = {
  tag: OutgoingTag;
  label?: string;
  traffic: Traffic;
};

export type ComponentSimResult = {
  processedRps: number;
  droppedRps: number;
  rejectedRps: number;
  latency: Latency;
  utilization: UtilizationMap;
  outgoing: OutgoingFlow[];
  notes: string[];
};

export type FieldSpec = {
  key: string;
  label: string;
  kind: "number" | "select" | "boolean" | "text";
  tier: FieldTier;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  hint?: string;
};

export type SimContext = {
  difficulty: Difficulty;
  peakRps: number;
  failures: ActiveFailure[];
};

export type ActiveFailure = {
  id: string;
  type: FailureType;
  targetNodeId?: string;
  multiplier?: number;
  extraLatencyMs?: number;
};

export type FailureType =
  | "kill_api"
  | "database_down"
  | "cache_down"
  | "kafka_down"
  | "traffic_spike"
  | "network_latency";

export type WorkloadConfig = {
  dau: number;
  concurrentUsers: number;
  requestsPerUserDay: number;
  readRatio: number;
  avgRequestBytes: number;
  avgResponseBytes: number;
  peakMultiplier: number;
  trafficGrowth: number;
};

export type DerivedWorkload = {
  dailyRequests: number;
  monthlyRequests: number;
  avgRps: number;
  peakRps: number;
  readRps: number;
  writeRps: number;
  ingressBps: number;
  egressBps: number;
};

export type SloConfig = {
  availability: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  rpoSeconds: number;
  rtoSeconds: number;
};

export type SloVerdict = {
  key: keyof SloConfig;
  label: string;
  target: string;
  actual: string;
  pass: boolean;
};

export type DesignNode = {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  config: Record<string, ConfigValue>;
  disabled?: boolean;
};

export type DesignEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type SystemDesign = {
  id: string;
  name: string;
  problemSlug?: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
  workload: WorkloadConfig;
  slo: SloConfig;
  difficulty: Difficulty;
  createdAt: string;
  updatedAt: string;
};

export type NodeMetrics = {
  incomingRps: number;
  processedRps: number;
  droppedRps: number;
  rejectedRps: number;
  latency: Latency;
  utilization: UtilizationMap;
  health: Health;
  notes: string[];
};

export type EdgeMetrics = {
  rps: number;
  label: string;
};

export type Bottleneck = {
  nodeId: string;
  label: string;
  severity: "primary" | "secondary";
  metric: string;
  demand: number;
  capacity: number;
  utilization: number;
  extraLatencyMs: number;
  why: string;
  suggestions: string[];
};

export type StorageBreakdown = {
  nodeId: string;
  label: string;
  rawGb: number;
  indexGb: number;
  replicaGb: number;
  backupGb: number;
  compressedGb: number;
  assumptions: string[];
};

export type CostLine = {
  key: string;
  label: string;
  monthly: number;
};

export type TimelineSample = {
  t: number;
  label: string;
  rps: number;
  cpu: number;
  p95: number;
  errors: number;
};

export type SimulationResult = {
  designId: string;
  timestamp: string;
  workload: DerivedWorkload;
  throughput: {
    incomingRps: number;
    processedRps: number;
    droppedRps: number;
    rejectedRps: number;
  };
  latency: Latency;
  errorRate: number;
  availability: number;
  nodes: Record<string, NodeMetrics>;
  edges: Record<string, EdgeMetrics>;
  bottlenecks: Bottleneck[];
  storage: StorageBreakdown[];
  cost: { lines: CostLine[]; total: number };
  slo: SloVerdict[];
  warnings: string[];
  timeline: TimelineSample[];
  criticalPath: { nodeId: string; label: string; ms: number }[];
};

export type SimulationRequest = {
  design: SystemDesign;
  failures: ActiveFailure[];
  scenario?: string;
};

export const HEALTH_THRESHOLDS = {
  warning: 0.7,
  critical: 0.85,
  overloaded: 1,
};

export const TIER_RANK: Record<FieldTier, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
};

export function emptyTraffic(): Traffic {
  return { rps: 0, readRps: 0, writeRps: 0, bytesInPerSec: 0, bytesOutPerSec: 0 };
}

export function scaleTraffic(traffic: Traffic, factor: number): Traffic {
  return {
    rps: traffic.rps * factor,
    readRps: traffic.readRps * factor,
    writeRps: traffic.writeRps * factor,
    bytesInPerSec: traffic.bytesInPerSec * factor,
    bytesOutPerSec: traffic.bytesOutPerSec * factor,
  };
}

export function addTraffic(a: Traffic, b: Traffic): Traffic {
  return {
    rps: a.rps + b.rps,
    readRps: a.readRps + b.readRps,
    writeRps: a.writeRps + b.writeRps,
    bytesInPerSec: a.bytesInPerSec + b.bytesInPerSec,
    bytesOutPerSec: a.bytesOutPerSec + b.bytesOutPerSec,
  };
}

export function healthFromUtil(values: number[]): Health {
  const peak = values.reduce((max, value) => Math.max(max, value), 0);
  if (peak >= HEALTH_THRESHOLDS.overloaded) return "overloaded";
  if (peak >= HEALTH_THRESHOLDS.critical) return "critical";
  if (peak >= HEALTH_THRESHOLDS.warning) return "warning";
  return "healthy";
}
