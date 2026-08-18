import { getKind } from "../components/registry";
import { deriveWorkload } from "../models/workload";
import {
  addTraffic,
  emptyTraffic,
  healthFromUtil,
  type ActiveFailure,
  type Bottleneck,
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
import { peakUtil } from "./queueing";
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
      failures: request.failures,
    });
    nodeMetrics[node.id] = {
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

  const sinks = design.nodes.filter((node) => !design.edges.some((edge) => edge.source === node.id));
  const processed = sinks.reduce((sum, node) => sum + (nodeMetrics[node.id]?.processedRps ?? 0), 0);
  const dropped = Object.values(nodeMetrics).reduce((sum, item) => sum + item.droppedRps + item.rejectedRps, 0);
  const errorRate = derived.peakRps > 0 ? dropped / derived.peakRps : 0;
  const availability = Math.max(0, 1 - errorRate);
  const path = criticalPath(design.nodes, design.edges, nodeMetrics);
  const latency = pathLatency(path);
  const bottlenecks = findBottlenecks(design.nodes, nodeMetrics);
  const slo = sloVerdicts(design.slo, { latency, errorRate, availability });
  const timeline = buildTimeline(request, derived.peakRps, latency.p95, errorRate, nodeMetrics);

  return {
    designId: design.id,
    timestamp: new Date().toISOString(),
    workload: derived,
    throughput: {
      incomingRps: derived.peakRps,
      processedRps: processed || Object.values(nodeMetrics).reduce((max, item) => Math.max(max, item.processedRps), 0),
      droppedRps: Object.values(nodeMetrics).reduce((sum, item) => sum + item.droppedRps, 0),
      rejectedRps: Object.values(nodeMetrics).reduce((sum, item) => sum + item.rejectedRps, 0),
    },
    latency,
    errorRate,
    availability,
    nodes: nodeMetrics,
    edges: edgeMetrics,
    bottlenecks,
    storage: estimateStorage(design.nodes, design.workload),
    cost: estimateCost(design.nodes),
    slo,
    warnings,
    timeline,
    criticalPath: path,
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
        node.config.maxOps = 1;
        node.config.hitRatio = 0;
        node.config.failureRate = 0.8;
      }
      if (failure.type === "kafka_down" && node.type === "kafka") {
        node.config.producerThroughput = 1;
        node.config.consumerThroughput = 1;
      }
      if (failure.type === "network_latency") {
        const key = node.config.baseLatencyMs != null ? "baseLatencyMs" : node.config.avgLatencyMs != null ? "avgLatencyMs" : node.config.readLatencyMs != null ? "readLatencyMs" : null;
        if (key) node.config[key] = Number(node.config[key] ?? 10) + (failure.extraLatencyMs ?? 80);
      }
    }
  }
  return { ...design, nodes, workload };
}

function route(
  node: DesignNode,
  outgoing: { tag: string; label?: string; traffic: Traffic }[],
  nodes: DesignNode[],
  edges: DesignEdge[],
  nodeTraffic: Map<string, Traffic>,
  edgeMetrics: Record<string, EdgeMetrics>,
): void {
  const next = edges.filter((edge) => edge.source === node.id);
  if (!next.length) return;
  const byId = new Map(nodes.map((item) => [item.id, item]));

  for (const edge of next) {
    const target = byId.get(edge.target);
    if (!target) continue;
    const flow = pickFlow(outgoing, target.type);
    nodeTraffic.set(edge.target, addTraffic(nodeTraffic.get(edge.target) ?? emptyTraffic(), flow.traffic));
    edgeMetrics[edge.id] = { rps: flow.traffic.rps, label: flow.label ?? `${Math.round(flow.traffic.rps).toLocaleString()} rps` };
  }

  // Implicit cache-miss to sibling databases when the cache is not wired onward.
  if (node.type === "redis") {
    const miss = outgoing.find((item) => item.tag === "miss");
    if (!miss) return;
    const parents = edges.filter((edge) => edge.target === node.id).map((edge) => edge.source);
    const siblingStores = edges
      .filter((edge) => parents.includes(edge.source))
      .map((edge) => byId.get(edge.target))
      .filter((item): item is DesignNode => Boolean(item && ["postgresql", "mysql", "nosql"].includes(item.type)));
    const already = new Set(next.map((edge) => edge.target));
    for (const store of siblingStores) {
      if (already.has(store.id)) continue;
      nodeTraffic.set(store.id, addTraffic(nodeTraffic.get(store.id) ?? emptyTraffic(), miss.traffic));
    }
  }
}

function pickFlow(outgoing: { tag: string; label?: string; traffic: Traffic }[], targetType: string): { traffic: Traffic; label?: string } {
  const cache = targetType === "redis";
  const store = ["postgresql", "mysql", "nosql", "object_storage"].includes(targetType);
  const queue = targetType === "kafka";
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
  for (const edge of edges) {
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
    const children = adj.get(id) ?? [];
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

function findBottlenecks(nodes: DesignNode[], metrics: Record<string, NodeMetrics>): Bottleneck[] {
  const ranked = nodes
    .map((node) => {
      const metric = metrics[node.id];
      const util = peakUtil(metric?.utilization ?? {});
      const demand = metric?.incomingRps ?? 0;
      const processed = metric?.processedRps ?? 0;
      return { node, metric, util, demand, processed };
    })
    .filter((item) => item.util >= 0.85 || (item.metric && item.metric.droppedRps + item.metric.rejectedRps > 1))
    .sort((a, b) => b.util - a.util);

  return ranked.slice(0, 3).map((item, index) => {
    const capacity = item.util > 0 ? item.demand / item.util : item.demand;
    const extra = item.util > 1 ? (item.util - 1) * 350 : item.util * 40;
    return {
      nodeId: item.node.id,
      label: item.node.label,
      severity: index === 0 ? "primary" : "secondary",
      metric: heaviestMetric(item.metric?.utilization ?? {}),
      demand: item.demand,
      capacity,
      utilization: item.util,
      extraLatencyMs: extra,
      why: `${item.node.label} is at ${Math.round(item.util * 100)}% on ${heaviestMetric(item.metric?.utilization ?? {})}. Incoming ${Math.round(item.demand).toLocaleString()} RPS against ~${Math.round(capacity).toLocaleString()} effective capacity.`,
      suggestions: suggestions(item.node.type),
    };
  });
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
