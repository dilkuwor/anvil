import type {
  DesignNode,
  DesignReview,
  Latency,
  NodeMetrics,
  ReviewCheck,
  SloConfig,
  SloVerdict,
  SystemDesign,
} from "../models/types";
import { deriveWorkload } from "../models/workload";
import { formatGb, formatNines, formatRps, formatUsd } from "../utils/format";
import { costForNode } from "./cost";
import { num, peakUtil, str } from "./queueing";

export type ReviewInput = {
  design: SystemDesign;
  nodes: Record<string, NodeMetrics>;
  slo: SloVerdict[];
  latency: Latency;
  criticalPath: { nodeId: string; label: string; ms: number }[];
  costTotal: number;
  /** Nodes a request reaches without crossing a queue. Losses elsewhere are backlog, not errors. */
  syncNodeIds?: string[];
};

const DB_TYPES = new Set(["postgresql", "mysql", "nosql"]);

/** Availability of one instance before redundancy. Managed edge services (DNS, CDN, blob store) are already redundant and sit near five nines. */
const BASE_AVAILABILITY: Record<string, number> = {
  dns: 0.99999,
  cdn: 0.99999,
  object_storage: 0.99999,
  rate_limiter: 0.999,
  load_balancer: 0.999,
  api_server: 0.999,
  redis: 0.999,
  postgresql: 0.999,
  mysql: 0.999,
  nosql: 0.999,
  kafka: 0.999,
  api_gateway: 0.999,
  websocket_gateway: 0.999,
  worker: 0.999,
  task_queue: 0.9999,
  search_index: 0.999,
  geo_index: 0.999,
  id_generator: 0.999,
  analytics_store: 0.999,
  scheduler: 0.999,
  notification_gateway: 0.999,
};

/** Not on the synchronous request path: their failure delays work instead of failing requests. */
const ASYNC_TYPES = new Set(["client", "kafka", "task_queue", "worker", "scheduler", "notification_gateway", "analytics_store"]);

/** Managed or external: already redundant on the provider side, so not a single point of failure you own. */
const MANAGED_TYPES = new Set(["dns", "cdn", "object_storage", "rate_limiter", "task_queue", "notification_gateway"]);

/**
 * Grades the design against the rubric interviewers actually use: did the candidate
 * meet the requirements, remove single points of failure, scale reads and writes
 * separately, keep the request path short, size storage, and not overspend.
 */
export function reviewDesign(input: ReviewInput): DesignReview {
  const { design } = input;
  const active = design.nodes.filter((node) => !node.disabled);
  const connected = new Set(design.edges.flatMap((edge) => [edge.source, edge.target]));
  const wired = active.filter((node) => connected.has(node.id) || active.length === 1);
  const derived = deriveWorkload(design.workload);
  const checks: ReviewCheck[] = [];

  checks.push(...requirementChecks(input));
  checks.push(...scalabilityChecks(wired, input, derived));
  const availability = availabilityEstimate(wired);
  checks.push(...reliabilityChecks(wired, input, derived, availability, design.slo));
  checks.push(...performanceChecks(wired, input));
  checks.push(...dataChecks(wired, input, derived));
  checks.push(...costChecks(wired, input, derived));

  const scored = checks.filter((check) => check.status !== "info");
  const points = scored.reduce((sum, check) => sum + (check.status === "pass" ? 1 : check.status === "warn" ? 0.5 : 0), 0);
  const score = scored.length ? Math.round((points / scored.length) * 100) : 0;
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D";
  const firstFail = checks.find((check) => check.status === "fail") ?? checks.find((check) => check.status === "warn");

  return {
    score,
    grade,
    summary: firstFail
      ? `Grade ${grade} (${score}/100). Fix first: ${firstFail.title}.`
      : `Grade ${grade} (${score}/100). No open findings; now defend the trade-offs out loud.`,
    estimatedAvailability: availability.total,
    weakestHop: availability.weakest,
    checks,
  };
}

function requirementChecks(input: ReviewInput): ReviewCheck[] {
  const p95 = input.slo.find((item) => item.key === "p95Ms");
  const errors = input.slo.find((item) => item.key === "errorRate");
  const checks: ReviewCheck[] = [];
  if (p95) {
    checks.push({
      id: "req-latency",
      area: "requirements",
      status: p95.pass ? "pass" : "fail",
      title: p95.pass ? "Latency SLO met" : "Latency SLO missed",
      detail: `p95 along the critical path is ${p95.actual} against a target of ${p95.target}.`,
      interviewer: "Where does the latency budget go? Walk me through each hop on the critical path.",
    });
  }
  if (errors) {
    const sync = input.syncNodeIds ? new Set(input.syncNodeIds) : null;
    const shedding = Object.entries(input.nodes)
      .filter(([id]) => !sync || sync.has(id))
      .map(([, metric]) => metric)
      .filter((metric) => peakUtil(metric.utilization) >= 1 || metric.droppedRps + metric.rejectedRps > Math.max(1, metric.incomingRps * 0.01));
    const saturated = shedding.length > 0;
    checks.push({
      id: "req-errors",
      area: "requirements",
      status: errors.pass ? "pass" : saturated ? "fail" : "warn",
      title: errors.pass ? "Error budget respected" : saturated ? "Error budget blown by shedding" : "Error budget eaten by baseline failures",
      detail: errors.pass
        ? `${errors.actual} of peak traffic is lost, under the ${errors.target} budget.`
        : saturated
          ? `${errors.actual} of peak traffic is dropped or rejected, over the ${errors.target} budget. ${shedding.map((metric) => metric.label).join(", ")} ${shedding.length === 1 ? "is" : "are"} shedding load.`
          : `${errors.actual} of peak traffic is lost against a ${errors.target} budget, but nothing is saturated: this is the components' own failure rates adding up along the path. Client retries with backoff, or a looser budget, close the gap.`,
      interviewer: saturated
        ? "Which component sheds load first at peak, and is that shedding graceful or a crash?"
        : "Every hop adds its own failure rate. Where do you retry, and how do you keep retries from amplifying an outage?",
    });
  }
  return checks;
}

function scalabilityChecks(nodes: DesignNode[], input: ReviewInput, derived: ReturnType<typeof deriveWorkload>): ReviewCheck[] {
  const checks: ReviewCheck[] = [];
  const apis = nodes.filter((node) => node.type === "api_server");
  const lbs = nodes.filter((node) => node.type === "load_balancer");
  const dbs = nodes.filter((node) => DB_TYPES.has(node.type));
  const caches = nodes.filter((node) => node.type === "redis");
  const cdns = nodes.filter((node) => node.type === "cdn");
  const queues = nodes.filter((node) => node.type === "kafka" || node.type === "task_queue");
  const blobs = nodes.filter((node) => node.type === "object_storage");
  const readRatio = input.design.workload.readRatio;
  const sockets = nodes.filter((node) => node.type === "websocket_gateway");

  if (!apis.length) {
    checks.push({
      id: "scale-stateless",
      area: "scalability",
      status: "fail",
      title: "No application tier",
      detail: "There is no API server between the edge and the data stores, so nothing can be scaled horizontally.",
      interviewer: "Where does request handling and business logic run?",
    });
  } else {
    const fanned = apis.reduce((sum, node) => sum + num(node.config, "instances", 8), 0);
    checks.push({
      id: "scale-stateless",
      area: "scalability",
      status: lbs.length ? "pass" : fanned > 1 ? "fail" : "warn",
      title: lbs.length ? "Stateless tier behind a load balancer" : "API instances without a load balancer",
      detail: lbs.length
        ? `${fanned} API instance${fanned === 1 ? "" : "s"} sit behind ${lbs.length} load balancer${lbs.length === 1 ? "" : "s"}, so you can add instances without touching clients.`
        : `${fanned} API instance${fanned === 1 ? "" : "s"} with no load balancer. Clients cannot spread across them and health checks have nowhere to live.`,
      interviewer: "What state lives on the API servers, and what breaks if one of them disappears mid-request?",
    });
  }

  if (dbs.length && readRatio >= 0.7) {
    const hit = caches.length ? Math.max(...caches.map((node) => num(node.config, "hitRatio", 0.9))) : 0;
    const shielded = caches.length > 0 || cdns.length > 0;
    checks.push({
      id: "scale-cache",
      area: "scalability",
      status: shielded ? (hit && hit < 0.8 ? "warn" : "pass") : "warn",
      title: shielded ? "Read-heavy load is cached" : "Read-heavy load with no cache",
      detail: shielded
        ? caches.length
          ? `${Math.round(readRatio * 100)}% of traffic is reads and ${Math.round(hit * 100)}% of them stop at the cache. Only ${formatRps(derived.readRps * (1 - hit))} rps reach the database.`
          : `${Math.round(readRatio * 100)}% of traffic is reads and the CDN absorbs cacheable responses at the edge.`
        : `${Math.round(readRatio * 100)}% of traffic is reads (${formatRps(derived.readRps)} rps) and every one hits the database. A cache-aside Redis would remove most of them.`,
      interviewer: "How did you arrive at that hit ratio, and what is your invalidation strategy: TTL, write-through, or explicit evict?",
    });
  }

  // Blobs only need a CDN when users fetch them on the request path; a crawler's page store behind workers does not.
  const syncIds = input.syncNodeIds ? new Set(input.syncNodeIds) : null;
  const servedBlobs = blobs.filter((blob) => !syncIds || syncIds.has(blob.id));
  const heavyResponse = input.design.workload.avgResponseBytes >= 20_000 || servedBlobs.length > 0;
  if (heavyResponse) {
    checks.push({
      id: "scale-cdn",
      area: "scalability",
      status: cdns.length ? "pass" : "warn",
      title: cdns.length ? "Large payloads served from the edge" : "Large payloads with no CDN",
      detail: cdns.length
        ? "Static and media responses are served near the user, cutting origin egress and latency."
        : `Responses average ${input.design.workload.avgResponseBytes.toLocaleString()} B${servedBlobs.length ? " and users fetch from an object store" : ""}. Without a CDN the origin pays for every byte of egress.`,
      interviewer: "What is cacheable at the edge, and how do you invalidate it when the object changes?",
    });
  }

  if (derived.writeRps >= 2_000) {
    checks.push({
      id: "scale-async",
      area: "scalability",
      status: queues.length ? "pass" : "warn",
      title: queues.length ? "Writes decoupled through a queue" : "Heavy writes with nothing to buffer them",
      detail: queues.length
        ? `${formatRps(derived.writeRps)} write rps can be absorbed by the log and drained at the consumers' pace.`
        : `${formatRps(derived.writeRps)} write rps hit the primary synchronously. A queue lets you absorb bursts and move non-critical work off the request path.`,
      interviewer: "Which writes must be synchronous for correctness, and which can be eventually consistent?",
    });
  }

  if (queues.length) {
    const orphaned = queues.filter((queue) => !input.design.edges.some((edge) => edge.source === queue.id));
    checks.push({
      id: "scale-consumers",
      area: "scalability",
      status: orphaned.length ? "warn" : "pass",
      title: orphaned.length ? "Queue with nothing consuming it" : "Async work has consumers",
      detail: orphaned.length
        ? `${orphaned.map((queue) => queue.label).join(", ")} ${orphaned.length === 1 ? "has" : "have"} no outgoing edge. Messages go in and nothing comes out; draw the worker pool that drains it and where the results land.`
        : `${queues.map((queue) => queue.label).join(", ")} feed downstream consumers, so the slow work has a place to run and a place to land.`,
      interviewer: "Who consumes this queue, how many of them, and what do they write when they are done?",
    });
  }

  if (sockets.length) {
    const capacity = sockets.reduce((sum, node) => sum + Math.max(1, num(node.config, "instances", 8)) * num(node.config, "maxConnections", 50_000), 0);
    const users = input.design.workload.concurrentUsers;
    const ok = capacity >= users;
    checks.push({
      id: "scale-connections",
      area: "scalability",
      status: ok ? (capacity < users * 1.3 ? "warn" : "pass") : "fail",
      title: ok ? "Connection capacity covers concurrent users" : "Not enough connection slots",
      detail: `${users.toLocaleString()} concurrent users need a socket each; the gateway tier holds ${capacity.toLocaleString()}.${ok ? (capacity < users * 1.3 ? " Under 30% headroom: a single instance loss drops users." : "") : " The rest cannot connect at all."}`,
      interviewer: "How many connections per box, what limits it, and how do you rebalance when one box dies?",
    });
  }

  for (const db of dbs) {
    const writeUtil = input.nodes[db.id]?.utilization.write ?? 0;
    if (writeUtil >= 0.7) {
      checks.push({
        id: `scale-writes-${db.id}`,
        area: "scalability",
        status: writeUtil >= 0.85 ? "fail" : "warn",
        title: `${db.label} primary is write-bound`,
        detail: `Writes are at ${Math.round(writeUtil * 100)}% of the single primary. Replicas do not help here; only sharding or partitioning spreads writes.`,
        interviewer: "What is your shard key, and how do you handle a hot partition and re-sharding later?",
      });
    }
  }

  if (apis.length && input.design.workload.peakMultiplier >= 3) {
    const scaled = apis.some((node) => Boolean(node.config.autoscaling));
    checks.push({
      id: "scale-auto",
      area: "scalability",
      status: scaled ? "pass" : "warn",
      title: scaled ? "Compute autoscales with the peak" : "Static fleet sized for a spiky peak",
      detail: scaled
        ? `Peak is ${input.design.workload.peakMultiplier}× average and the API tier scales on CPU, so you pay for the average, not the peak.`
        : `Peak is ${input.design.workload.peakMultiplier}× average. A fixed fleet either pays for peak all day or falls over when it arrives.`,
      interviewer: "How long does a scale-out take, and what absorbs the burst during those minutes?",
    });
  }

  return checks;
}

type AvailabilityEstimate = {
  total: number;
  hops: { nodeId: string; label: string; availability: number; redundancy: number }[];
  weakest: { nodeId: string; label: string; availability: number } | null;
};

/** Series of synchronous hops, each made redundant by its own instances: 1 − (1 − a)^n. */
export function availabilityEstimate(nodes: DesignNode[]): AvailabilityEstimate {
  const hops = nodes
    .filter((node) => !ASYNC_TYPES.has(node.type))
    .map((node) => {
      const base = BASE_AVAILABILITY[node.type] ?? 0.999;
      const redundancy = redundancyOf(node);
      const availability = 1 - Math.pow(1 - base, Math.max(1, Math.min(redundancy, 4)));
      return { nodeId: node.id, label: node.label, availability, redundancy };
    });
  const total = hops.reduce((product, hop) => product * hop.availability, 1);
  const worst = hops.reduce<AvailabilityEstimate["weakest"]>(
    (acc, hop) => (!acc || hop.availability < acc.availability ? { nodeId: hop.nodeId, label: hop.label, availability: hop.availability } : acc),
    null,
  );
  // Only name a weak hop when one is genuinely below four nines; otherwise the floor is the managed edge.
  const weakest = worst && worst.availability < 0.9999 ? worst : null;
  return { total: hops.length ? total : 0, hops, weakest };
}

export function redundancyOf(node: DesignNode): number {
  const c = node.config;
  switch (node.type) {
    case "load_balancer":
    case "api_server":
    case "api_gateway":
    case "websocket_gateway":
    case "worker":
    case "geo_index":
    case "id_generator":
    case "scheduler":
      return Math.max(1, num(c, "instances", 1));
    case "search_index":
      return 1 + Math.max(0, num(c, "replicas", 0));
    case "analytics_store":
      return Math.max(1, Math.min(num(c, "replicationFactor", 1), num(c, "nodes", 1)));
    case "rate_limiter":
      // Runs inside the gateway fleet, so it inherits that fleet's redundancy.
      return 2;
    case "redis":
      return 1 + Math.max(0, num(c, "replicas", 0));
    case "postgresql":
    case "mysql":
      return 1 + Math.max(0, num(c, "readReplicas", 0));
    case "nosql":
      return Math.max(1, num(c, "replicationFactor", 1));
    case "kafka":
      return Math.max(1, Math.min(num(c, "replicationFactor", 1), num(c, "brokers", 1)));
    default:
      return 1;
  }
}

function reliabilityChecks(
  nodes: DesignNode[],
  input: ReviewInput,
  derived: ReturnType<typeof deriveWorkload>,
  availability: AvailabilityEstimate,
  slo: SloConfig,
): ReviewCheck[] {
  const checks: ReviewCheck[] = [];
  const spofs = nodes.filter((node) => node.type !== "client" && redundancyOf(node) < 2 && !MANAGED_TYPES.has(node.type));
  if (spofs.length) {
    for (const node of spofs) {
      checks.push({
        id: `rel-spof-${node.id}`,
        area: "reliability",
        status: "fail",
        title: `${node.label} is a single point of failure`,
        detail: spofDetail(node),
        interviewer: `${node.label} dies at peak. What do users see in the next 30 seconds, and how does it recover?`,
      });
    }
  } else {
    checks.push({
      id: "rel-spof",
      area: "reliability",
      status: "pass",
      title: "No single points of failure on the request path",
      detail: "Every self-managed component has at least one replica or extra instance to fail over to.",
      interviewer: "Failover is automatic or manual? Who promotes the replica and how long does it take?",
    });
  }

  if (availability.hops.length) {
    const target = slo.availability;
    const pass = availability.total >= target;
    const weakest = availability.weakest;
    checks.push({
      id: "rel-availability",
      area: "reliability",
      status: pass ? "pass" : "fail",
      title: pass ? `Redundancy supports ${formatNines(target)}` : `Redundancy math lands at ${formatNines(availability.total)}`,
      detail: `${availability.hops.length} synchronous hops in series: each hop is 1 − (1 − a)^n, then multiplied together. Result ${formatNines(availability.total)} vs SLO ${formatNines(target)}.${weakest ? ` Weakest hop: ${weakest.label} at ${formatNines(weakest.availability)}.` : ""}`,
      interviewer: "Availability in series multiplies down. Which hop would you make redundant first, and what does that buy you?",
    });
  }

  const limiter = nodes.some((node) => node.type === "rate_limiter");
  checks.push({
    id: "rel-edge",
    area: "reliability",
    status: limiter ? "pass" : "warn",
    title: limiter ? "Origin protected by a rate limiter" : "Nothing throttles abusive clients",
    detail: limiter
      ? "Abusive clients and retry storms are rejected at the edge before they reach compute."
      : "One misbehaving client or a retry storm reaches the API tier at full speed. A token-bucket limiter at the edge is a cheap fix.",
    interviewer: "A client retries in a tight loop after a timeout. What stops that from taking down everyone else?",
  });

  const caches = nodes.filter((node) => node.type === "redis");
  const dbs = nodes.filter((node) => DB_TYPES.has(node.type));
  if (caches.length && dbs.length) {
    const dbReadCap = dbs.reduce((sum, db) => {
      const replicas = num(db.config, "readReplicas", 0);
      return sum + num(db.config, "readCapacity", 20_000) * (1 + replicas * 0.85);
    }, 0);
    const survives = dbReadCap >= derived.readRps;
    checks.push({
      id: "rel-stampede",
      area: "reliability",
      status: survives ? "pass" : "warn",
      title: survives ? "Database survives a cold cache" : "Cache loss would flood the database",
      detail: survives
        ? `If the cache vanishes, ${formatRps(derived.readRps)} read rps land on the database, which can take ${formatRps(dbReadCap)}.`
        : `If the cache vanishes, ${formatRps(derived.readRps)} read rps land on a database that can take ${formatRps(dbReadCap)}. That is a thundering herd.`,
      interviewer: "The cache restarts empty at peak. How do you warm it without stampeding the database?",
    });
  }

  for (const queue of nodes.filter((node) => node.type === "kafka" || node.type === "worker")) {
    const consume = input.nodes[queue.id]?.utilization.consume ?? input.nodes[queue.id]?.utilization.jobs ?? 0;
    if (consume >= 0.85) {
      checks.push({
        id: `rel-lag-${queue.id}`,
        area: "reliability",
        status: consume >= 1 ? "fail" : "warn",
        title: consume >= 1 ? `${queue.label} consumers cannot keep up` : `${queue.label} consumers are near their limit`,
        detail: consume >= 1
          ? "Producers outpace consumers, so lag grows without bound until retention drops messages."
          : `Consumers run at ${Math.round(consume * 100)}% of capacity. Any hiccup turns into lag.`,
        interviewer: "Consumer lag is growing. Do you add consumers, add partitions, or both, and why does the order matter?",
      });
    }
  }

  return checks;
}

function spofDetail(node: DesignNode): string {
  switch (node.type) {
    case "load_balancer":
    case "api_server":
      return "One instance. Add at least one more so a deploy or a crash does not take the tier down.";
    case "redis":
      return "No replica. Losing it sends the entire read load to the database at once.";
    case "postgresql":
    case "mysql":
      return "No replica. There is nothing to fail over to, and the only copy of the data is one disk failure from gone.";
    case "nosql":
      return "Replication factor 1. One node loss means data loss.";
    case "kafka":
      return "Replication factor 1. A broker loss drops every partition it led.";
    case "worker":
      return "One worker. The queue backs up the moment it restarts, and there is no parallelism to drain it.";
    case "websocket_gateway":
      return "One gateway holds every connection. Its restart disconnects every user at once.";
    case "api_gateway":
      return "One gateway instance in front of everything. Every request dies with it.";
    case "search_index":
      return "No replicas. A node loss makes part of the corpus unsearchable until it is rebuilt.";
    case "geo_index":
      return "One instance holds every location. Nearby queries stop entirely when it restarts.";
    case "id_generator":
      return "One ID generator means every write stops when it is down. Run several with distinct node IDs.";
    case "scheduler":
      return "One scheduler. When it is down no jobs fire, and nobody notices until something is stale.";
    case "analytics_store":
      return "Replication factor 1. Losing a node loses that slice of history.";
    default:
      return "No redundancy configured.";
  }
}

function performanceChecks(nodes: DesignNode[], input: ReviewInput): ReviewCheck[] {
  const checks: ReviewCheck[] = [];
  const hops = input.criticalPath.filter((hop) => nodes.find((node) => node.id === hop.nodeId)?.type !== "client");
  if (hops.length) {
    const slowest = hops.reduce((worst, hop) => (hop.ms > worst.ms ? hop : worst), hops[0]);
    checks.push({
      id: "perf-hops",
      area: "performance",
      status: hops.length <= 5 ? "pass" : hops.length <= 7 ? "warn" : "fail",
      title: `${hops.length} synchronous hops on the critical path`,
      detail: `${hops.map((hop) => hop.label).join(" → ")}. Slowest hop: ${slowest.label} at ${Math.round(slowest.ms)}ms p95.${hops.length > 5 ? " Every extra hop adds latency and a failure mode." : ""}`,
      interviewer: "Which hop would you remove or make asynchronous, and what would you lose by doing so?",
    });
  }

  for (const db of nodes.filter((node) => DB_TYPES.has(node.type))) {
    const mode = str(db.config, "replication", "async");
    const replicas = num(db.config, "readReplicas", 0);
    if (mode === "sync") {
      checks.push({
        id: `perf-sync-${db.id}`,
        area: "performance",
        status: "info",
        title: `${db.label} replicates synchronously`,
        detail: "Every write waits for a replica acknowledgement. You bought zero data loss with write latency; say that trade-off out loud.",
        interviewer: "A replica is slow. Do writes stall or does the primary continue alone?",
      });
    } else if (mode === "async" && replicas > 0) {
      checks.push({
        id: `perf-stale-${db.id}`,
        area: "performance",
        status: "info",
        title: `${db.label} replicas can serve stale reads`,
        detail: "Async replication means a read right after a write may miss it. Route read-your-own-writes to the primary or accept eventual consistency.",
        interviewer: "A user posts and immediately refreshes. Do they see their own write?",
      });
    }
  }
  return checks;
}

function dataChecks(nodes: DesignNode[], input: ReviewInput, derived: ReturnType<typeof deriveWorkload>): ReviewCheck[] {
  const checks: ReviewCheck[] = [];
  const stores = nodes.filter((node) => DB_TYPES.has(node.type) || node.type === "object_storage");
  checks.push({
    id: "data-durable",
    area: "data",
    status: stores.length ? "pass" : "fail",
    title: stores.length ? "Data has a durable home" : "No durable store",
    detail: stores.length
      ? `${stores.map((node) => node.label).join(", ")} persist the data. Caches and queues alone are not durable.`
      : "Nothing on the canvas persists data across a restart.",
    interviewer: "Which store is the source of truth, and what does everything else derive from it?",
  });

  const dbs = nodes.filter((node) => DB_TYPES.has(node.type));
  if (dbs.length) {
    const blobCapacity = nodes.filter((node) => node.type === "object_storage").reduce((sum, blob) => sum + num(blob.config, "capacityTb", 50) * 1000, 0);
    const provisioned = dbs.reduce((sum, db) => sum + num(db.config, "storageGb", 2000), 0) + blobCapacity;
    const enough = provisioned >= derived.storageYearGb;
    checks.push({
      id: "data-headroom",
      area: "data",
      status: enough ? "pass" : "warn",
      title: enough ? "Storage covers a year of growth" : "Storage fills up within a year",
      detail: `${formatGb(provisioned)} provisioned across ${dbs.length} database${dbs.length === 1 ? "" : "s"}${blobCapacity ? " and object storage" : ""}; the workload writes ${formatGb(derived.storageYearGb)} per year and ${formatGb(derived.storageFiveYearGb)} over five, before replicas and indexes, at ${(input.design.workload.avgRecordBytes ?? 1000).toLocaleString()} B per write (Workload → Stored bytes / write).`,
      interviewer: "What happens when the disk fills? Archive, shard, or tier to cold storage?",
    });
  }

  const blobs = nodes.filter((node) => node.type === "object_storage");
  if (blobs.length) {
    checks.push({
      id: "data-blobs",
      area: "data",
      status: "pass",
      title: "Blobs live in object storage",
      detail: "Media and files go to the blob store; the database keeps only metadata and a pointer.",
      interviewer: "How do clients upload: through your API, or straight to the bucket with a pre-signed URL?",
    });
  }
  return checks;
}

function costChecks(nodes: DesignNode[], input: ReviewInput, derived: ReturnType<typeof deriveWorkload>): ReviewCheck[] {
  const checks: ReviewCheck[] = [];
  const perMillion = derived.monthlyRequests > 0 ? (input.costTotal / derived.monthlyRequests) * 1_000_000 : 0;
  checks.push({
    id: "cost-unit",
    area: "cost",
    status: "info",
    title: `${formatUsd(input.costTotal)}/month, about ${perMillion < 1 ? `$${perMillion.toFixed(2)}` : formatUsd(perMillion)} per million requests`,
    detail: "Unit cost is the number to quote. It lets you compare two designs that serve the same load.",
    interviewer: "If traffic doubles, does cost double? Which line item grows fastest?",
  });

  // Only throughput-sized tiers can be "idle". Stores are priced by disk and shielded by caches, so they get their own replica check below.
  const sizedByThroughput = new Set(["api_server", "worker", "load_balancer", "api_gateway", "websocket_gateway", "redis", "kafka", "geo_index", "id_generator", "scheduler", "task_queue"]);
  const idle = nodes
    .filter((node) => sizedByThroughput.has(node.type))
    .map((node) => ({ node, util: peakUtil(input.nodes[node.id]?.utilization ?? {}), cost: costForNode(node) }))
    .filter((item) => item.util > 0 && item.util < 0.1 && item.cost >= 500);
  checks.push({
    id: "cost-idle",
    area: "cost",
    status: idle.length ? "warn" : "pass",
    title: idle.length ? "Expensive tiers sitting mostly idle" : "Expensive tiers are pulling their weight",
    detail: idle.length
      ? idle.map((item) => `${item.node.label} at ${Math.round(item.util * 100)}% for ${formatUsd(item.cost)}/mo`).join("; ") + ". Headroom is good; 5× headroom is money."
      : "Every compute tier costing over $500/month runs above 10% utilization at peak.",
    interviewer: "Where would you cut 30% of this bill without touching the SLO?",
  });

  const lazyReplicas = nodes
    .filter((node) => node.type === "postgresql" || node.type === "mysql")
    .map((node) => ({ node, replicas: num(node.config, "readReplicas", 0), readUtil: input.nodes[node.id]?.utilization.read ?? 0 }))
    .filter((item) => item.replicas >= 2 && item.readUtil < 0.05);
  if (lazyReplicas.length) {
    checks.push({
      id: "cost-replicas",
      area: "cost",
      status: "warn",
      title: "Read replicas with almost nothing to read",
      detail: lazyReplicas.map((item) => `${item.node.label} has ${item.replicas} read replicas at ${Math.round(item.readUtil * 100)}% read utilization`).join("; ") + ". The cache is doing the reading. Keep one replica for failover and justify the rest.",
      interviewer: "What are those replicas for: read scaling, failover, or reporting? Each answer sizes them differently.",
    });
  }
  return checks;
}
