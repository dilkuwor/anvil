import { getKind } from "../components/registry";
import { deriveWorkload } from "../models/workload";
import {
  addTraffic,
  emptyTraffic,
  healthFromUtil,
  scaleTraffic,
  type ActiveFailure,
  type Bottleneck,
  type ConfigValue,
  type FailureType,
  type DesignEdge,
  type DesignNode,
  type EdgeMetrics,
  type Latency,
  type NodeMetrics,
  type SimulationRequest,
  type SimulationResult,
  type SloVerdict,
  type Traffic,
} from "../models/types";
import { estimateCost } from "./cost";
import { estimateWorkload } from "./estimate";
import { num, peakUtil } from "./queueing";
import { reviewDesign } from "./review";
import { estimateStorage } from "./storage";
import { validateDesign } from "./validate";

export function runSimulation(request: SimulationRequest): SimulationResult {
  const design = applyFailures(request.design, request.failures);
  const warnings = validateDesign(design);
  const derived = deriveWorkload(design.workload);
  const incoming = workloadTraffic(derived);
  const nodeTraffic = new Map<string, Traffic>();
  const nodeMetrics: Record<string, NodeMetrics> = {};
  const edgeMetrics: Record<string, EdgeMetrics> = {};

  for (const node of design.nodes) nodeTraffic.set(node.id, emptyTraffic());
  const effectiveConfig = new Map<string, Record<string, ConfigValue>>();

  const sources = design.nodes.filter((node) => node.type === "client");
  const start = sources.length ? sources : design.nodes.filter((node) => !design.edges.some((edge) => edge.target === node.id));
  for (const node of start) {
    nodeTraffic.set(node.id, addTraffic(nodeTraffic.get(node.id) ?? emptyTraffic(), incoming));
  }

  const order = topo(design.nodes, design.edges);
  for (const node of order) {
    const traffic = nodeTraffic.get(node.id) ?? emptyTraffic();
    if (node.type === "client" && traffic.rps === 0) {
      nodeTraffic.set(node.id, incoming);
    }
    if (node.disabled) {
      const inbound = nodeTraffic.get(node.id) ?? emptyTraffic();
      nodeMetrics[node.id] = {
        label: node.label,
        type: node.type,
        incomingRps: inbound.rps,
        processedRps: 0,
        droppedRps: inbound.rps,
        rejectedRps: 0,
        latency: { p50: 0, p95: 0, p99: 0 },
        utilization: {},
        health: "overloaded",
        notes: ["This component is disabled and does not process traffic."],
      };
      continue;
    }
    const kind = getKind(node.type);
    const result = kind.simulate(node.config, nodeTraffic.get(node.id) ?? emptyTraffic(), {
      difficulty: design.difficulty,
      peakRps: derived.peakRps,
      concurrentUsers: design.workload.concurrentUsers,
      outgoingEdges: design.edges.filter((edge) => edge.source === node.id).length,
      failures: request.failures,
    });
    if (result.effectiveConfig) effectiveConfig.set(node.id, result.effectiveConfig);
    nodeMetrics[node.id] = {
      label: node.label,
      type: node.type,
      incomingRps: (nodeTraffic.get(node.id) ?? emptyTraffic()).rps,
      processedRps: result.processedRps,
      droppedRps: result.droppedRps,
      rejectedRps: result.rejectedRps,
      latency: result.latency,
      utilization: result.utilization,
      health: healthFromUtil(Object.values(result.utilization)),
      notes: result.notes,
    };
    route(node, result.outgoing, design.nodes, design.edges, nodeTraffic, edgeMetrics);
  }

  // What made it through end to end. Summing sinks would double-count fan-out (a write that hits both the database and the queue).
  // Only losses on the synchronous side fail a user's request; losses behind a queue are backlog.
  const sync = syncReachable(design.nodes, design.edges);
  const dropped = Object.entries(nodeMetrics).reduce((sum, [id, item]) => (sync.has(id) ? sum + item.droppedRps + item.rejectedRps : sum), 0);
  const backlog = Object.entries(nodeMetrics).reduce((sum, [id, item]) => (sync.has(id) ? sum : sum + item.droppedRps + item.rejectedRps), 0);
  const processed = Math.max(0, derived.peakRps - dropped);
  const errorRate = derived.peakRps > 0 ? dropped / derived.peakRps : 0;
  const availability = Math.max(0, 1 - errorRate);
  const path = criticalPath(design.nodes, design.edges, nodeMetrics);
  const latency = pathLatency(path);
  const billed = design.nodes.map((node) => {
    const override = effectiveConfig.get(node.id);
    return override ? { ...node, config: { ...node.config, ...override } } : node;
  });
  const bottlenecks = findBottlenecks(billed, nodeMetrics, request.failures);
  const slo = sloVerdicts(design.slo, { latency, errorRate, availability });
  const timeline = buildTimeline(request, derived.peakRps, latency.p95, errorRate, nodeMetrics);
  const cost = estimateCost(billed);
  const review = reviewDesign({
    design: request.design,
    nodes: nodeMetrics,
    slo,
    latency,
    criticalPath: path,
    costTotal: cost.total,
    syncNodeIds: [...sync],
  });

  return {
    designId: design.id,
    timestamp: new Date().toISOString(),
    workload: derived,
    throughput: {
      incomingRps: derived.peakRps,
      processedRps: processed,
      droppedRps: Object.entries(nodeMetrics).reduce((sum, [id, item]) => (sync.has(id) ? sum + item.droppedRps : sum), 0),
      rejectedRps: Object.entries(nodeMetrics).reduce((sum, [id, item]) => (sync.has(id) ? sum + item.rejectedRps : sum), 0),
      backlogRps: backlog,
    },
    latency,
    errorRate,
    availability,
    nodes: nodeMetrics,
    edges: edgeMetrics,
    bottlenecks,
    storage: estimateStorage(design.nodes, design.workload),
    cost,
    slo,
    warnings,
    timeline,
    criticalPath: path,
    estimate: estimateWorkload(request.design.workload, request.design.nodes),
    review,
  };
}

function workloadTraffic(derived: ReturnType<typeof deriveWorkload>): Traffic {
  return {
    rps: derived.peakRps,
    readRps: derived.readRps,
    writeRps: derived.writeRps,
    bytesInPerSec: derived.ingressBps,
    bytesOutPerSec: derived.egressBps,
  };
}

function applyFailures(design: SimulationRequest["design"], failures: ActiveFailure[]): SimulationRequest["design"] {
  if (!failures.length) return design;
  const nodes = design.nodes.map((node) => ({ ...node, config: { ...node.config } }));
  let workload = { ...design.workload };
  for (const failure of failures) {
    if (failure.type === "traffic_spike") {
      workload = { ...workload, peakMultiplier: workload.peakMultiplier * (failure.multiplier ?? 5) };
    }
    for (const node of nodes) {
      if (failure.targetNodeId && node.id !== failure.targetNodeId) continue;
      if (failure.type === "kill_api" && node.type === "api_server") {
        node.config.instances = Math.max(1, Math.floor(Number(node.config.instances ?? 2) / 2));
        node.config.failureRate = 0.15;
      }
      if (failure.type === "database_down" && ["postgresql", "mysql", "nosql"].includes(node.type)) {
        node.config.readCapacity = 1;
        node.config.writeCapacity = 1;
        node.config.failureRate = 0.6;
      }
      if (failure.type === "cache_down" && node.type === "redis") {
        // A dead cache does not drop reads; it stops answering them, so every read falls through to storage.
        node.config.hitRatio = 0;
      }
      if (failure.type === "kafka_down" && node.type === "kafka") {
        node.config.producerThroughput = 1;
        node.config.consumerThroughput = 1;
      }
      if (failure.type === "network_latency") {
        const key = ["baseLatencyMs", "avgLatencyMs", "readLatencyMs", "queryLatencyMs", "latencyMs"].find((name) => node.config[name] != null) ?? null;
        if (key) node.config[key] = Number(node.config[key] ?? 10) + (failure.extraLatencyMs ?? 80);
      }
    }
  }
  return { ...design, nodes, workload };
}

const STORE_TYPES = new Set(["postgresql", "mysql", "nosql"]);

/**
 * A cache with no outgoing edge still sends its misses somewhere: to the stores its own
 * caller also talks to. Drawing API → Redis and API → Postgres is enough; the miss path is implied.
 */
function implicitMissTargets(node: DesignNode, nodes: DesignNode[], edges: DesignEdge[]): DesignNode[] {
  if (node.type !== "redis") return [];
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const parents = edges.filter((edge) => edge.target === node.id).map((edge) => edge.source);
  const explicit = new Set(edges.filter((edge) => edge.source === node.id).map((edge) => edge.target));
  const seen = new Set<string>();
  const stores: DesignNode[] = [];
  for (const edge of edges) {
    if (!parents.includes(edge.source) || explicit.has(edge.target) || seen.has(edge.target)) continue;
    const target = byId.get(edge.target);
    if (!target || !STORE_TYPES.has(target.type)) continue;
    seen.add(target.id);
    stores.push(target);
  }
  return stores;
}

function route(
  node: DesignNode,
  outgoing: { tag: string; label?: string; traffic: Traffic }[],
  nodes: DesignNode[],
  edges: DesignEdge[],
  nodeTraffic: Map<string, Traffic>,
  edgeMetrics: Record<string, EdgeMetrics>,
): void {
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const next = edges.filter((edge) => edge.source === node.id);

  for (const edge of next) {
    const target = byId.get(edge.target);
    if (!target) continue;
    const picked = pickFlow(outgoing, target.type);
    const traffic = scaleTraffic(picked.traffic, edgeShare(edge));
    nodeTraffic.set(edge.target, addTraffic(nodeTraffic.get(edge.target) ?? emptyTraffic(), traffic));
    edgeMetrics[edge.id] = { rps: traffic.rps, label: picked.label ?? `${Math.round(traffic.rps).toLocaleString()} rps` };
  }

  const miss = outgoing.find((item) => item.tag === "miss");
  if (!miss || miss.traffic.rps <= 0) return;
  const stores = implicitMissTargets(node, nodes, edges);
  if (!stores.length) return;
  const share = scaleTraffic(miss.traffic, 1 / stores.length);
  for (const store of stores) {
    nodeTraffic.set(store.id, addTraffic(nodeTraffic.get(store.id) ?? emptyTraffic(), share));
  }
}

/** Fraction of the picked flow that this edge carries. Lets one API fan reads to a cache and 5% of them to search. */
export function edgeShare(edge: DesignEdge): number {
  const weight = edge.weight;
  if (typeof weight !== "number" || !Number.isFinite(weight)) return 1;
  return Math.min(1, Math.max(0, weight));
}

function pickFlow(outgoing: { tag: string; label?: string; traffic: Traffic }[], targetType: string): { traffic: Traffic; label?: string } {
  const first = (...tags: string[]) => tags.map((tag) => outgoing.find((item) => item.tag === tag)).find(Boolean);
  const cache = targetType === "redis";
  const store = ["postgresql", "mysql", "nosql", "object_storage", "analytics_store"].includes(targetType);
  const queue = targetType === "kafka" || targetType === "task_queue";
  if (targetType === "worker" || targetType === "notification_gateway") return first("async", "write", "default") ?? outgoing[0] ?? { traffic: emptyTraffic() };
  if (targetType === "search_index" || targetType === "geo_index") return first("read", "default", "miss") ?? outgoing[0] ?? { traffic: emptyTraffic() };
  if (targetType === "id_generator") return first("write", "default") ?? outgoing[0] ?? { traffic: emptyTraffic() };
  if (cache) return outgoing.find((item) => item.tag === "read" || item.tag === "hit") ?? outgoing[0] ?? { traffic: emptyTraffic() };
  if (store) {
    return (
      outgoing.find((item) => item.tag === "miss") ??
      outgoing.find((item) => item.tag === "write") ??
      outgoing.find((item) => item.tag === "default") ??
      outgoing[0] ?? { traffic: emptyTraffic() }
    );
  }
  if (queue) return outgoing.find((item) => item.tag === "write" || item.tag === "async") ?? outgoing[0] ?? { traffic: emptyTraffic() };
  return outgoing.find((item) => item.tag === "default" || item.tag === "miss") ?? outgoing[0] ?? { traffic: emptyTraffic() };
}

function topo(nodes: DesignNode[], edges: DesignEdge[]): DesignNode[] {
  const inbound = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    inbound.set(node.id, 0);
    adj.set(node.id, []);
  }
  const implied = nodes.flatMap((node) =>
    implicitMissTargets(node, nodes, edges).map((store) => ({ id: `implicit-${node.id}-${store.id}`, source: node.id, target: store.id })),
  );
  for (const edge of [...edges, ...implied]) {
    adj.get(edge.source)?.push(edge.target);
    inbound.set(edge.target, (inbound.get(edge.target) ?? 0) + 1);
  }
  const queue = nodes.filter((node) => (inbound.get(node.id) ?? 0) === 0).map((node) => node.id);
  const seen: string[] = [];
  while (queue.length) {
    const id = queue.shift();
    if (!id) break;
    seen.push(id);
    for (const next of adj.get(id) ?? []) {
      inbound.set(next, (inbound.get(next) ?? 1) - 1);
      if ((inbound.get(next) ?? 0) <= 0) queue.push(next);
    }
  }
  const leftover = nodes.filter((node) => !seen.includes(node.id)).map((node) => node.id);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return [...seen, ...leftover].map((id) => byId.get(id)!);
}

/** Queues end the synchronous request: the enqueue is on the path, whatever drains it is not. */
const ASYNC_BOUNDARY = new Set(["kafka", "task_queue"]);

/** Nodes a user's request can reach without crossing a queue. Everything else is async and its losses are backlog. */
export function syncReachable(nodes: DesignNode[], edges: DesignEdge[]): Set<string> {
  const adj = new Map<string, string[]>();
  for (const node of nodes) adj.set(node.id, []);
  for (const edge of edges) adj.get(edge.source)?.push(edge.target);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const starts = nodes.filter((node) => node.type === "client");
  const seen = new Set<string>((starts.length ? starts : nodes.filter((node) => !edges.some((edge) => edge.target === node.id) && node.type !== "scheduler")).map((node) => node.id));
  const queue = [...seen];
  while (queue.length) {
    const id = queue.shift()!;
    if (ASYNC_BOUNDARY.has(byId.get(id)?.type ?? "")) continue;
    for (const next of adj.get(id) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function criticalPath(nodes: DesignNode[], edges: DesignEdge[], metrics: Record<string, NodeMetrics>): { nodeId: string; label: string; ms: number }[] {
  const adj = new Map<string, string[]>();
  for (const node of nodes) adj.set(node.id, []);
  for (const edge of edges) adj.get(edge.source)?.push(edge.target);
  const starts = nodes.filter((node) => node.type === "client");
  let best: { nodeId: string; label: string; ms: number }[] = [];
  function walk(id: string, acc: { nodeId: string; label: string; ms: number }[]): void {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    const next = [...acc, { nodeId: id, label: node.label, ms: metrics[id]?.latency.p95 ?? 0 }];
    const children = ASYNC_BOUNDARY.has(node.type) ? [] : (adj.get(id) ?? []);
    if (!children.length) {
      const sum = next.reduce((total, item) => total + item.ms, 0);
      const bestSum = best.reduce((total, item) => total + item.ms, 0);
      if (sum >= bestSum) best = next;
      return;
    }
    for (const child of children) walk(child, next);
  }
  for (const start of starts.length ? starts : nodes.slice(0, 1)) walk(start.id, []);
  return best;
}

function pathLatency(path: { ms: number }[]): Latency {
  const p95 = path.reduce((sum, item) => sum + item.ms, 0);
  return { p50: p95 * 0.45, p95, p99: p95 * 1.7 };
}

const FAILURE_LABEL: Record<FailureType, string> = {
  kill_api: "Kill half the APIs",
  database_down: "Database impaired",
  cache_down: "Cache down",
  kafka_down: "Kafka impaired",
  traffic_spike: "Traffic spike",
  network_latency: "Network latency",
};

const FAILURE_TARGETS: Partial<Record<FailureType, string[]>> = {
  kill_api: ["api_server"],
  database_down: ["postgresql", "mysql", "nosql"],
  cache_down: ["redis"],
  kafka_down: ["kafka"],
};

/** The injected failure that is hitting this node, if any. */
function injectedFailure(node: DesignNode, failures: ActiveFailure[]): ActiveFailure | undefined {
  return failures.find((failure) => {
    if (failure.targetNodeId && failure.targetNodeId !== node.id) return false;
    return FAILURE_TARGETS[failure.type]?.includes(node.type) ?? false;
  });
}

function formatUtil(util: number): string {
  return util > 10 ? "over 1000%" : `${Math.round(util * 100)}%`;
}

function findBottlenecks(nodes: DesignNode[], metrics: Record<string, NodeMetrics>, failures: ActiveFailure[] = []): Bottleneck[] {
  const ranked = nodes
    .map((node) => {
      const metric = metrics[node.id];
      const util = peakUtil(metric?.utilization ?? {});
      const demand = metric?.incomingRps ?? 0;
      const processed = metric?.processedRps ?? 0;
      return { node, metric, util, demand, processed };
    })
    // Baseline failure rates always lose a few requests; only real shedding (>1% of incoming) counts.
    .filter((item) => item.util >= 0.85 || (item.metric && item.metric.droppedRps + item.metric.rejectedRps > Math.max(1, item.demand * 0.01)))
    .sort((a, b) => b.util - a.util);

  return ranked.slice(0, 3).map((item, index) => {
    const capacity = item.util > 0 ? item.demand / item.util : item.demand;
    const extra = item.util > 1 ? (item.util - 1) * 350 : item.util * 40;
    const failure = injectedFailure(item.node, failures);
    const metric = heaviestMetric(item.metric?.utilization ?? {});
    return {
      nodeId: item.node.id,
      label: item.node.label,
      severity: index === 0 ? "primary" : "secondary",
      metric,
      demand: item.demand,
      capacity,
      utilization: item.util,
      extraLatencyMs: extra,
      why: failure
        ? `${item.node.label} is taken out by the injected “${FAILURE_LABEL[failure.type]}” failure. ${Math.round(item.demand).toLocaleString()} RPS were arriving here.`
        : `${item.node.label} is at ${formatUtil(item.util)} on ${metric}. Incoming ${Math.round(item.demand).toLocaleString()} RPS against ~${Math.round(capacity).toLocaleString()} effective capacity.`,
      fix: failure
        ? "The bottleneck is the failure itself. The question is what the rest of the design does now: look at where the traffic falls through and whether the Review still passes."
        : concreteFix(item.node, item.util, metric),
      suggestions: failure ? ["Add a replica or fallback so this failure degrades instead of drops", "Clear the failure to see the steady state"] : suggestions(item.node.type),
    };
  });
}

const TARGET_UTIL = 0.7;

/** Turns "this is hot" into "add this many", using the node's own config. */
export function concreteFix(node: DesignNode, util: number, metric: string): string | undefined {
  if (util < TARGET_UTIL) return undefined;
  const c = node.config;
  const scale = util / TARGET_UTIL;
  switch (node.type) {
    case "api_server":
    case "load_balancer": {
      const current = Math.max(1, num(c, "instances", node.type === "api_server" ? 8 : 2));
      const needed = Math.ceil(current * scale);
      if (node.type === "api_server" && c.autoscaling) {
        return `Autoscaling is capped at ${num(c, "maxInstances", current)} instances; raise the ceiling to about ${needed} or cut per-request work.`;
      }
      return `Go from ${current} to about ${needed} instances to sit at ${Math.round(TARGET_UTIL * 100)}% utilization.`;
    }
    case "postgresql":
    case "mysql":
    case "nosql": {
      if (metric === "write") {
        return "Writes only scale by sharding: split the primary by a key (user id, short code) so each shard sees a fraction of the writes.";
      }
      const replicas = Math.max(0, num(c, "readReplicas", 0));
      const capPerReplica = 0.85;
      const needed = Math.ceil(((1 + replicas * capPerReplica) * scale - 1) / capPerReplica);
      if (needed > replicas) return `Go from ${replicas} to about ${needed} read replicas, or raise the cache hit ratio so fewer reads arrive.`;
      return "Raise the cache hit ratio or shard the store.";
    }
    case "redis": {
      const ops = num(c, "maxOps", 120_000);
      return `Shard the cache: about ${Math.ceil(scale)} shards of ${Math.round(ops).toLocaleString()} ops/s each, or raise per-node ops.`;
    }
    case "kafka": {
      if (metric === "consume") {
        const consumers = Math.max(1, num(c, "consumers", 12));
        const partitions = Math.max(1, num(c, "partitions", 24));
        const needed = Math.ceil(consumers * scale);
        return needed > partitions
          ? `Go from ${consumers} to about ${needed} consumers, which also means at least ${needed} partitions (you have ${partitions}).`
          : `Go from ${consumers} to about ${needed} consumers; ${partitions} partitions is enough.`;
      }
      const brokers = Math.max(1, num(c, "brokers", 3));
      return `Go from ${brokers} to about ${Math.ceil(brokers * scale)} brokers, or batch producers.`;
    }
    case "rate_limiter":
      return `Raise the limit to about ${Math.round(num(c, "limitRps", 20_000) * scale).toLocaleString()} rps if this is legitimate traffic.`;
    case "worker":
    case "api_gateway":
    case "websocket_gateway":
    case "geo_index":
    case "id_generator": {
      const current = Math.max(1, num(c, "instances", 1));
      const needed = Math.ceil(current * scale);
      const what = node.type === "websocket_gateway" && metric === "connections" ? "to hold the connections" : node.type === "worker" ? "to drain the queue" : `to sit at ${Math.round(TARGET_UTIL * 100)}% utilization`;
      return `Go from ${current} to about ${needed} instances ${what}.`;
    }
    case "search_index":
    case "analytics_store": {
      const current = Math.max(1, num(c, "nodes", 3));
      return `Go from ${current} to about ${Math.ceil(current * scale)} nodes${node.type === "search_index" ? ", or add replicas per shard for read throughput" : ""}.`;
    }
    case "task_queue":
      return `Raise queue throughput to about ${Math.round(num(c, "maxThroughput", 30_000) * scale).toLocaleString()} msg/s, or partition into several queues.`;
    case "notification_gateway":
      return `Provider quota is the ceiling: batch ${Math.ceil(num(c, "batchSize", 100) * scale)} per request, spread the burst over time, or ask for a higher limit.`;
    case "dns":
      return `Raise DNS capacity to about ${Math.round(num(c, "qps", 100_000) * scale).toLocaleString()} qps or lengthen the TTL so clients ask less often.`;
    case "cdn":
      return `Raise edge capacity to about ${Math.round(num(c, "maxRps", 200_000) * scale).toLocaleString()} rps.`;
    default:
      return undefined;
  }
}

function heaviestMetric(utilization: Record<string, number>): string {
  let best = "rps";
  let value = -1;
  for (const [key, amount] of Object.entries(utilization)) {
    if (amount > value) {
      best = key;
      value = amount;
    }
  }
  return best;
}

function suggestions(type: string): string[] {
  if (type === "postgresql" || type === "mysql" || type === "nosql") {
    return ["Add read replicas or shard writes", "Move hot reads behind a cache", "Batch or enqueue writes", "Raise primary capacity"];
  }
  if (type === "api_server") return ["Add instances or enable autoscaling", "Cut per-request work", "Put a cache in front of hot reads"];
  if (type === "load_balancer") return ["Add LB instances", "Raise per-instance RPS", "Split traffic by region"];
  if (type === "redis") return ["Increase max ops or shard the cache", "Tune TTL / eviction", "Add a replica"];
  if (type === "kafka") return ["Add consumers or partitions", "Speed up consumer processing", "Buffer producers"];
  if (type === "rate_limiter") return ["Raise the limit if this is legitimate traffic", "Add burst capacity", "Back-pressure clients"];
  return ["Scale the component", "Reduce incoming traffic", "Split the responsibility"];
}

function sloVerdicts(
  slo: SimulationRequest["design"]["slo"],
  actual: { latency: Latency; errorRate: number; availability: number },
): SloVerdict[] {
  return [
    { key: "availability", label: "Availability", target: `${(slo.availability * 100).toFixed(3)}%`, actual: `${(actual.availability * 100).toFixed(3)}%`, pass: actual.availability >= slo.availability },
    { key: "p95Ms", label: "p95 latency", target: `< ${slo.p95Ms}ms`, actual: `${Math.round(actual.latency.p95)}ms`, pass: actual.latency.p95 <= slo.p95Ms },
    { key: "p99Ms", label: "p99 latency", target: `< ${slo.p99Ms}ms`, actual: `${Math.round(actual.latency.p99)}ms`, pass: actual.latency.p99 <= slo.p99Ms },
    { key: "errorRate", label: "Error rate", target: `< ${(slo.errorRate * 100).toFixed(2)}%`, actual: `${(actual.errorRate * 100).toFixed(2)}%`, pass: actual.errorRate <= slo.errorRate },
  ];
}

function buildTimeline(
  request: SimulationRequest,
  peakRps: number,
  peakP95: number,
  peakErrors: number,
  metrics: Record<string, NodeMetrics>,
): SimulationResult["timeline"] {
  const cpu = peakUtil(Object.values(metrics)[0]?.utilization ?? { cpu: 0.4 });
  const points = [0.2, 0.4, 0.65, 0.85, 1];
  return points.map((factor, index) => ({
    t: index / (points.length - 1),
    label: `${index * 2}:00`,
    rps: peakRps * factor,
    cpu: Math.min(1.3, cpu * factor * 1.05),
    p95: peakP95 * (0.4 + factor * 0.6) * (factor > 0.8 ? 1.2 : 1),
    errors: peakErrors * factor * (factor > 0.85 ? 1.4 : 0.6),
  }));
}

export function compareResults(a: SimulationResult, b: SimulationResult) {
  return {
    rps: [a.throughput.processedRps, b.throughput.processedRps],
    p95: [a.latency.p95, b.latency.p95],
    errorRate: [a.errorRate, b.errorRate],
    cost: [a.cost.total, b.cost.total],
    availability: [a.availability, b.availability],
  };
}
