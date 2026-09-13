import { applyQueueing, bool, num, str } from "../engine/queueing";
import type { Latency, Traffic } from "../models/types";
import { emptyTraffic, scaleTraffic } from "../models/types";
import { result, type ComponentKind } from "./kind";

/**
 * The async, real-time, search, and coordination side of the palette. These are the pieces
 * the harder catalog problems (chat, feeds, autocomplete, ride-sharing, crawlers) cannot be
 * drawn without.
 */

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

export const apiGatewayKind: ComponentKind = {
  type: "api_gateway",
  label: "API Gateway",
  category: "networking",
  description: "Single entry point: TLS termination, auth, routing, and per-client limits in one hop.",
  icon: "DoorOpen",
  defaultLabel: "API Gateway",
  defaultConfig: { instances: 2, maxRps: 30_000, authMs: 2, baseLatencyMs: 3, failureRate: 0.0001 },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 50 },
    { key: "maxRps", label: "Max RPS / instance", kind: "number", tier: "intermediate", min: 100 },
    { key: "authMs", label: "Auth check", kind: "number", tier: "intermediate", unit: "ms", hint: "JWT verify is ~1ms; a remote token lookup is 5–20ms." },
    { key: "baseLatencyMs", label: "Base latency", kind: "number", tier: "beginner", unit: "ms" },
    { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.0001 },
  ],
  interview: {
    whenToUse: "In front of a public API with more than one backend service, or whenever auth and routing should live in one place instead of in every service.",
    tradeoffs: [
      "One hop does TLS, auth, routing, and throttling, which simplifies services but makes the gateway a hot path and a blast radius.",
      "Validating a JWT locally is fast; calling an auth service per request adds a round trip to everything.",
      "A gateway is where you version APIs and shape traffic; it is also where a bad config takes everything down at once.",
    ],
    questions: [
      "What does the gateway do that the load balancer does not?",
      "How does a request get authenticated without a network call on every hop?",
    ],
  },
  simulate(config, incoming) {
    const instances = Math.max(1, num(config, "instances", 2));
    const cap = instances * num(config, "maxRps", 30_000) * 0.85;
    const { processed, dropped, util } = saturate(incoming.rps, cap);
    const fail = processed * num(config, "failureRate", 0.0001);
    return result({
      processedRps: processed - fail,
      droppedRps: dropped + fail,
      latency: applyQueueing(latency(num(config, "baseLatencyMs", 3) + num(config, "authMs", 2)), util),
      utilization: { rps: util },
      outgoing: [{ tag: "default", traffic: passThrough(incoming, processed - fail) }],
      notes: [`Auth adds ${num(config, "authMs", 2)}ms per request. Effective capacity ${Math.round(cap).toLocaleString()} RPS.`],
    });
  },
};

export const websocketGatewayKind: ComponentKind = {
  type: "websocket_gateway",
  label: "WebSocket Gateway",
  category: "networking",
  description: "Holds persistent connections. Capacity is connections and messages per second, not requests.",
  icon: "Cable",
  defaultLabel: "WebSocket Gateway",
  defaultConfig: { instances: 8, maxConnections: 50_000, messagesPerSec: 20_000, heartbeatSec: 30, fanout: 1, baseLatencyMs: 4 },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 500 },
    { key: "maxConnections", label: "Connections / instance", kind: "number", tier: "beginner", hint: "Bounded by file descriptors and memory per socket, usually 10k–100k." },
    { key: "messagesPerSec", label: "Messages / sec / instance", kind: "number", tier: "intermediate" },
    { key: "heartbeatSec", label: "Heartbeat interval", kind: "number", tier: "advanced", unit: "s", min: 1 },
    { key: "fanout", label: "Fan-out per message", kind: "number", tier: "intermediate", min: 1, hint: "Group chat of 10 means one inbound message becomes 10 outbound." },
    { key: "baseLatencyMs", label: "Base latency", kind: "number", tier: "beginner", unit: "ms" },
  ],
  interview: {
    whenToUse: "Chat, presence, live location, notifications: anything where the server pushes to the client instead of waiting to be asked.",
    tradeoffs: [
      "Persistent connections are cheap per message but pin state to a server, so the gateway must be sticky and must know where each user is connected.",
      "Heartbeats keep NATs and load balancers from dropping idle sockets, at the cost of constant background traffic.",
      "Fan-out happens here: a message to a group of 500 is 500 sends, and that multiplies faster than request traffic ever does.",
    ],
    questions: [
      "User A is connected to gateway 3 and user B to gateway 7. How does a message get across?",
      "A gateway instance dies with 50,000 connections. What do those clients do in the next 10 seconds?",
    ],
  },
  simulate(config, incoming, context) {
    const instances = Math.max(1, num(config, "instances", 8));
    const connections = context.concurrentUsers;
    const connectionCap = instances * num(config, "maxConnections", 50_000);
    const heartbeats = connections / Math.max(1, num(config, "heartbeatSec", 30));
    const fanout = Math.max(1, num(config, "fanout", 1));
    const messageCap = instances * num(config, "messagesPerSec", 20_000);
    const demand = incoming.rps * fanout + heartbeats;
    const { processed, util: messageUtil } = saturate(demand, messageCap);
    const accepted = demand > 0 ? (processed / demand) * incoming.rps : incoming.rps;
    const connectionUtil = connections / Math.max(1, connectionCap);
    const refused = connectionUtil > 1 ? incoming.rps * (1 - 1 / connectionUtil) : 0;
    const delivered = Math.max(0, accepted - refused);
    return result({
      processedRps: delivered,
      droppedRps: Math.max(0, incoming.rps - delivered),
      latency: applyQueueing(latency(num(config, "baseLatencyMs", 4)), Math.max(messageUtil, connectionUtil)),
      utilization: { connections: connectionUtil, messages: messageUtil },
      outgoing: [{ tag: "default", traffic: passThrough(incoming, delivered) }],
      notes: [
        `${Math.round(connections).toLocaleString()} concurrent connections against ${connectionCap.toLocaleString()} slots (${instances} × ${num(config, "maxConnections", 50_000).toLocaleString()}).`,
        `${Math.round(heartbeats).toLocaleString()} heartbeats/s plus ${fanout}× fan-out = ${Math.round(demand).toLocaleString()} msg/s.`,
      ],
    });
  },
};

export const workerKind: ComponentKind = {
  type: "worker",
  label: "Worker Pool",
  category: "compute",
  description: "Consumes jobs from a queue or log and does the slow work off the request path.",
  icon: "Cpu",
  defaultLabel: "Workers",
  defaultConfig: { instances: 6, concurrency: 8, jobMs: 50, maxRetries: 3, failureRate: 0.002, idempotent: true },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 500 },
    { key: "concurrency", label: "Jobs in flight / instance", kind: "number", tier: "intermediate", min: 1 },
    { key: "jobMs", label: "Job duration", kind: "number", tier: "beginner", unit: "ms", min: 1 },
    { key: "maxRetries", label: "Max retries", kind: "number", tier: "advanced", min: 0 },
    { key: "idempotent", label: "Idempotent jobs", kind: "boolean", tier: "advanced", hint: "Required for safe retries with at-least-once delivery." },
    { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.0001 },
  ],
  interview: {
    whenToUse: "Behind a queue for anything the user does not need to wait for: fan-out, thumbnails, transcoding, indexing, emails, crawling.",
    tradeoffs: [
      "Throughput is instances × concurrency ÷ job time. Slow jobs need more workers, not faster queues.",
      "At-least-once delivery means a job can run twice; idempotency keys make that harmless.",
      "Poison messages retry forever unless there is a retry cap and a dead-letter queue.",
    ],
    questions: [
      "A worker dies halfway through a job. Who notices, and is the job redone?",
      "How many workers do you need to keep lag under a minute at peak?",
    ],
  },
  simulate(config, incoming) {
    const instances = Math.max(1, num(config, "instances", 6));
    const jobMs = Math.max(1, num(config, "jobMs", 50));
    const cap = (instances * Math.max(1, num(config, "concurrency", 8)) * 1000) / jobMs;
    const { processed, dropped, util } = saturate(incoming.rps, cap);
    const fail = processed * num(config, "failureRate", 0.002);
    const retried = bool(config, "idempotent", true) ? fail : 0;
    const completed = processed - fail + retried * 0.9;
    return result({
      processedRps: completed,
      droppedRps: dropped + (fail - retried * 0.9),
      latency: applyQueueing(latency(jobMs, jobMs * 1.6, jobMs * 2.5), util),
      utilization: { jobs: util },
      outgoing: [{ tag: "write", label: "results", traffic: { ...passThrough(incoming, completed), readRps: 0, writeRps: completed, rps: completed } }],
      notes: [
        `Capacity ${Math.round(cap).toLocaleString()} jobs/s (${instances} × ${num(config, "concurrency", 8)} ÷ ${jobMs}ms).`,
        dropped > 0
          ? `Backlog grows by ${Math.round(dropped).toLocaleString()} jobs/s: ${Math.round(dropped * 60).toLocaleString()} per minute of peak.`
          : "Workers keep up; nothing queues for long.",
      ],
    });
  },
};

export const taskQueueKind: ComponentKind = {
  type: "task_queue",
  label: "Task Queue",
  category: "messaging",
  description: "SQS/RabbitMQ-style queue: visibility timeout, retries, dead-letter. No replay, no ordering across the queue.",
  icon: "ListTodo",
  defaultLabel: "Task Queue",
  defaultConfig: { maxThroughput: 30_000, visibilityTimeoutSec: 30, maxRetries: 3, deadLetter: true, latencyMs: 10 },
  fields: [
    { key: "maxThroughput", label: "Max throughput", kind: "number", tier: "beginner", unit: "msg/s" },
    { key: "visibilityTimeoutSec", label: "Visibility timeout", kind: "number", tier: "intermediate", unit: "s", hint: "Longer than the slowest job, or two workers process the same message." },
    { key: "maxRetries", label: "Max retries", kind: "number", tier: "intermediate", min: 0 },
    { key: "deadLetter", label: "Dead-letter queue", kind: "boolean", tier: "intermediate" },
    { key: "latencyMs", label: "Enqueue latency", kind: "number", tier: "beginner", unit: "ms" },
  ],
  interview: {
    whenToUse: "Work items that each get processed once by one worker: emails, thumbnails, webhooks. Pick Kafka instead when many consumers need the same events or you need replay.",
    tradeoffs: [
      "A queue deletes a message once it is acknowledged; a log keeps it for retention. That is the whole queue-versus-log decision.",
      "Visibility timeout is the failure detector: too short and jobs run twice, too long and a crashed worker delays its job by that much.",
      "A dead-letter queue turns poison messages from an outage into a ticket.",
    ],
    questions: [
      "Why a queue here and not Kafka? What would change if you needed replay?",
      "A message fails three times. Where does it go, and who looks at it?",
    ],
  },
  simulate(config, incoming) {
    const { processed, dropped, util } = saturate(incoming.rps, num(config, "maxThroughput", 30_000));
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(num(config, "latencyMs", 10)), util),
      utilization: { rps: util },
      outgoing: [{ tag: "async", label: "jobs", traffic: passThrough(incoming, processed) }],
      notes: [
        `${num(config, "maxRetries", 3)} retries${bool(config, "deadLetter", true) ? ", then dead-letter" : " and then the message is lost"}. Visibility timeout ${num(config, "visibilityTimeoutSec", 30)}s.`,
      ],
    });
  },
};

export const searchIndexKind: ComponentKind = {
  type: "search_index",
  label: "Search Index",
  category: "search",
  description: "Inverted index or trie service. Fast text and prefix queries; indexing lags the primary store.",
  icon: "Search",
  defaultLabel: "Search Index",
  defaultConfig: { nodes: 3, replicas: 1, shards: 5, queryCapacity: 5_000, queryLatencyMs: 20, indexLagSec: 2, documents: 100_000_000, docBytes: 1_000 },
  fields: [
    { key: "nodes", label: "Nodes", kind: "number", tier: "beginner", min: 1, max: 100 },
    { key: "replicas", label: "Replicas / shard", kind: "number", tier: "beginner", min: 0, max: 5 },
    { key: "shards", label: "Shards", kind: "number", tier: "intermediate", min: 1 },
    { key: "queryCapacity", label: "Queries / sec / node", kind: "number", tier: "intermediate" },
    { key: "queryLatencyMs", label: "Query latency", kind: "number", tier: "beginner", unit: "ms" },
    { key: "indexLagSec", label: "Index lag", kind: "number", tier: "advanced", unit: "s", hint: "Time between a write to the primary store and the document being searchable." },
    { key: "documents", label: "Documents", kind: "number", tier: "intermediate" },
    { key: "docBytes", label: "Indexed bytes / doc", kind: "number", tier: "advanced", unit: "B" },
  ],
  interview: {
    whenToUse: "Full-text search, autocomplete, and any query the primary store answers with a table scan.",
    tradeoffs: [
      "The index is derived data: it lags the source of truth by the indexing pipeline, so a just-created item is not searchable for a moment.",
      "Shards spread the corpus; replicas spread the queries. A query fans out to every shard, so more shards means more tail latency.",
      "Autocomplete wants a trie or prefix index in memory, updated offline from logs, not a live query per keystroke against the database.",
    ],
    questions: [
      "A user creates a post and searches for it a second later. What happens?",
      "How does the index get updated: dual write from the API, or a consumer on the change log?",
    ],
  },
  simulate(config, incoming) {
    const nodes = Math.max(1, num(config, "nodes", 3));
    const queries = incoming.readRps || incoming.rps;
    const cap = nodes * num(config, "queryCapacity", 5_000);
    const { processed, dropped, util } = saturate(queries, cap);
    const shardFanout = Math.max(1, num(config, "shards", 5));
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(num(config, "queryLatencyMs", 20), num(config, "queryLatencyMs", 20) * (1.5 + Math.log10(shardFanout))), util),
      utilization: { queries: util },
      outgoing: [],
      notes: [`${Math.round(cap).toLocaleString()} queries/s across ${nodes} nodes; each query fans out to ${shardFanout} shards. Freshness lags by ~${num(config, "indexLagSec", 2)}s.`],
    });
  },
};

export const geoIndexKind: ComponentKind = {
  type: "geo_index",
  label: "Geo Index",
  category: "search",
  description: "Geohash or quadtree service for nearby queries. Handles a firehose of location updates.",
  icon: "MapPin",
  defaultLabel: "Geo Index",
  defaultConfig: { instances: 4, cellSizeM: 500, queryCapacity: 20_000, updateCapacity: 100_000, updatesPerSec: 30_000, queryLatencyMs: 5 },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 100 },
    { key: "cellSizeM", label: "Cell size", kind: "number", tier: "intermediate", unit: "m", hint: "Smaller cells mean more precise results and more cells to scan per query." },
    { key: "queryCapacity", label: "Queries / sec / instance", kind: "number", tier: "intermediate" },
    { key: "updateCapacity", label: "Updates / sec / instance", kind: "number", tier: "intermediate" },
    { key: "updatesPerSec", label: "Location updates / sec", kind: "number", tier: "beginner", hint: "Drivers × pings per second. 100k drivers every 4 seconds is 25k/s." },
    { key: "queryLatencyMs", label: "Query latency", kind: "number", tier: "beginner", unit: "ms" },
  ],
  interview: {
    whenToUse: "Ride-sharing, delivery, and any 'what is near me' feature. Relational indexes cannot answer radius queries at scale.",
    tradeoffs: [
      "Geohash prefixes turn a radius search into a handful of key lookups, but cells near a boundary need neighbour scans.",
      "Location updates are a write firehose; keep them in memory with a short TTL rather than writing every ping to disk.",
      "Precision versus fan-out: a 100 m cell is precise but a 5 km radius touches thousands of them.",
    ],
    questions: [
      "How many cells does one nearby query touch, and what happens at a cell boundary?",
      "Where do the 25,000 location updates per second go, and how long do you keep them?",
    ],
  },
  simulate(config, incoming) {
    const instances = Math.max(1, num(config, "instances", 4));
    const queries = incoming.rps;
    const updates = num(config, "updatesPerSec", 30_000);
    const queryCap = instances * num(config, "queryCapacity", 20_000);
    const updateCap = instances * num(config, "updateCapacity", 100_000);
    const { processed, dropped, util: queryUtil } = saturate(queries, queryCap);
    const updateUtil = updates / Math.max(1, updateCap);
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(num(config, "queryLatencyMs", 5)), Math.max(queryUtil, updateUtil)),
      utilization: { queries: queryUtil, updates: updateUtil },
      outgoing: [],
      notes: [`${Math.round(updates).toLocaleString()} location updates/s against ${updateCap.toLocaleString()} capacity; ${Math.round(queries).toLocaleString()} nearby queries/s.`],
    });
  },
};

export const idGeneratorKind: ComponentKind = {
  type: "id_generator",
  label: "ID Generator",
  category: "coordination",
  description: "Hands out unique IDs or short codes. Every write needs one, so it is on the write path.",
  icon: "Hash",
  defaultLabel: "ID Generator",
  defaultConfig: { instances: 3, idsPerSec: 100_000, latencyMs: 1, scheme: "snowflake" },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 64 },
    { key: "idsPerSec", label: "IDs / sec / instance", kind: "number", tier: "intermediate" },
    { key: "latencyMs", label: "Latency", kind: "number", tier: "beginner", unit: "ms", step: 0.1 },
    {
      key: "scheme",
      label: "Scheme",
      kind: "select",
      tier: "beginner",
      options: [
        { value: "snowflake", label: "Snowflake (time + node + seq)" },
        { value: "ticket_db", label: "Ticket server (DB counter)" },
        { value: "random_hash", label: "Random / hash + collision check" },
        { value: "key_range", label: "Pre-allocated key ranges" },
      ],
    },
  ],
  interview: {
    whenToUse: "URL shorteners, tweets, orders: anywhere IDs must be unique across many servers without a round trip to one database.",
    tradeoffs: [
      "Snowflake IDs are time-sortable and need no coordination, but depend on clocks and a unique node ID per instance.",
      "A ticket server is simple and strictly increasing, and it is a single point of failure unless you run two with odd/even ranges.",
      "Random codes need a collision check on insert; pre-allocated ranges avoid it but leak how many items exist.",
    ],
    questions: [
      "How do you guarantee uniqueness across 50 API servers without a lock?",
      "What breaks if a server's clock goes backwards?",
    ],
  },
  simulate(config, incoming) {
    const instances = Math.max(1, num(config, "instances", 3));
    const writes = incoming.writeRps || incoming.rps;
    const cap = instances * num(config, "idsPerSec", 100_000);
    const { processed, dropped, util } = saturate(writes, cap);
    const scheme = str(config, "scheme", "snowflake");
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(num(config, "latencyMs", 1), num(config, "latencyMs", 1) * 2, num(config, "latencyMs", 1) * 4), util),
      utilization: { ids: util },
      outgoing: [],
      notes: [
        scheme === "ticket_db"
          ? "Ticket server: strictly increasing, one counter. Run two with odd/even ranges or it is a single point of failure."
          : scheme === "random_hash"
            ? "Random codes: check for collisions on insert; collision odds rise with the square of the count."
            : scheme === "key_range"
              ? "Pre-allocated ranges: each server grabs a block; no coordination per write, some IDs wasted on restart."
              : "Snowflake: 41 bits of time, 10 bits of node, 12 bits of sequence. Needs unique node IDs and sane clocks.",
      ],
    });
  },
};

export const analyticsStoreKind: ComponentKind = {
  type: "analytics_store",
  label: "Analytics Store",
  category: "search",
  description: "Columnar / time-series store for events and metrics. Huge ingest, slow-but-rich queries, retention-based growth.",
  icon: "BarChart3",
  defaultLabel: "Analytics Store",
  defaultConfig: { nodes: 3, replicationFactor: 2, ingestCapacity: 200_000, queryCapacity: 200, retentionDays: 90, eventBytes: 200, compression: 0.3, eventsPerDay: 100_000_000 },
  fields: [
    { key: "nodes", label: "Nodes", kind: "number", tier: "beginner", min: 1, max: 100 },
    { key: "replicationFactor", label: "Replication factor", kind: "number", tier: "intermediate", min: 1, max: 5 },
    { key: "ingestCapacity", label: "Ingest / sec / node", kind: "number", tier: "intermediate", unit: "events" },
    { key: "queryCapacity", label: "Queries / sec", kind: "number", tier: "advanced" },
    { key: "retentionDays", label: "Retention", kind: "number", tier: "beginner", unit: "days" },
    { key: "eventBytes", label: "Bytes / event", kind: "number", tier: "intermediate", unit: "B" },
    { key: "eventsPerDay", label: "Events / day", kind: "number", tier: "intermediate", hint: "Used for the Storage tab. The simulation uses whatever traffic actually arrives." },
    { key: "compression", label: "Compression", kind: "number", tier: "expert", min: 0.05, max: 1, step: 0.05 },
  ],
  interview: {
    whenToUse: "Click streams, metrics, audit logs: append-only events queried by time range and aggregate, never by primary key.",
    tradeoffs: [
      "Columnar storage compresses events 5–10× and makes aggregates fast, while point lookups and updates are slow or impossible.",
      "Retention is the cost lever: 90 days of a 200-byte event at 100M/day is very different from 2 years.",
      "Feed it from the log, not from the request path, so analytics being down never blocks a user.",
    ],
    questions: [
      "Why not keep click events in Postgres?",
      "How fresh does the dashboard need to be, and what does that decide about the pipeline?",
    ],
  },
  simulate(config, incoming) {
    const nodes = Math.max(1, num(config, "nodes", 3));
    const cap = nodes * num(config, "ingestCapacity", 200_000);
    const { processed, dropped, util } = saturate(incoming.rps, cap);
    return result({
      processedRps: processed,
      droppedRps: dropped,
      latency: applyQueueing(latency(8, 20, 60), util),
      utilization: { ingest: util },
      outgoing: [],
      notes: [`Ingesting ${Math.round(incoming.rps).toLocaleString()} events/s against ${cap.toLocaleString()}. ${num(config, "retentionDays", 90)}-day retention sizes the Storage tab.`],
    });
  },
};

export const schedulerKind: ComponentKind = {
  type: "scheduler",
  label: "Scheduler",
  category: "compute",
  description: "Cron or job scheduler. Generates its own traffic: crawls, digests, retention sweeps, retries.",
  icon: "Timer",
  defaultLabel: "Scheduler",
  defaultConfig: { instances: 2, jobsPerSec: 200, leaderElection: true, bytesPerJob: 500 },
  fields: [
    { key: "instances", label: "Instances", kind: "number", tier: "beginner", min: 1, max: 10 },
    { key: "jobsPerSec", label: "Jobs / sec at peak", kind: "number", tier: "beginner", hint: "This node is a traffic source. Its jobs flow along its outgoing edges." },
    { key: "leaderElection", label: "Leader election", kind: "boolean", tier: "intermediate", hint: "Without it, two instances fire every job twice." },
    { key: "bytesPerJob", label: "Bytes / job", kind: "number", tier: "advanced", unit: "B" },
  ],
  interview: {
    whenToUse: "Web crawlers, notification digests, expiring links, re-indexing, anything that runs on a clock rather than on a request.",
    tradeoffs: [
      "Two schedulers without leader election run every job twice; one scheduler without a standby runs nothing when it dies.",
      "Fire jobs into a queue rather than calling services directly, so a burst at midnight is absorbed instead of amplified.",
      "Jobs must be idempotent and resumable: the scheduler will eventually fire the same job twice.",
    ],
    questions: [
      "The scheduler restarts at 00:00:30. Which of the midnight jobs ran, and which run again?",
      "How do you spread a job that touches 100 million rows across a day?",
    ],
  },
  simulate(config, incoming) {
    const jobs = num(config, "jobsPerSec", 200) * (bool(config, "leaderElection", true) ? 1 : Math.max(1, num(config, "instances", 2)));
    const bytes = num(config, "bytesPerJob", 500);
    const generated: Traffic = { rps: jobs, readRps: 0, writeRps: jobs, bytesInPerSec: jobs * bytes, bytesOutPerSec: 0 };
    return result({
      processedRps: jobs + incoming.rps,
      latency: latency(2, 4, 8),
      utilization: { rps: 0.1 },
      outgoing: [{ tag: "default", label: "jobs", traffic: generated }],
      notes: [
        bool(config, "leaderElection", true)
          ? `Emits ${Math.round(jobs).toLocaleString()} jobs/s from one elected leader.`
          : `No leader election: ${num(config, "instances", 2)} instances each fire every job, ${Math.round(jobs).toLocaleString()} jobs/s in total.`,
      ],
    });
  },
};

export const notificationGatewayKind: ComponentKind = {
  type: "notification_gateway",
  label: "Notification Gateway",
  category: "messaging",
  description: "Push, SMS, and email through a third-party provider with its own quota and failure rate.",
  icon: "Bell",
  defaultLabel: "Push / Email",
  defaultConfig: { providerRateLimit: 5_000, batchSize: 100, failureRate: 0.02, latencyMs: 150, channel: "push" },
  fields: [
    { key: "providerRateLimit", label: "Provider limit", kind: "number", tier: "beginner", unit: "req/s" },
    { key: "batchSize", label: "Messages / request", kind: "number", tier: "intermediate", min: 1, hint: "Most providers accept batches; 1 means one API call per message." },
    {
      key: "channel",
      label: "Channel",
      kind: "select",
      tier: "beginner",
      options: [
        { value: "push", label: "Push (APNs / FCM)" },
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
      ],
    },
    { key: "latencyMs", label: "Provider latency", kind: "number", tier: "intermediate", unit: "ms" },
    { key: "failureRate", label: "Failure rate", kind: "number", tier: "expert", step: 0.001 },
  ],
  interview: {
    whenToUse: "Any user-facing alert. It is always an external dependency, so it belongs behind a queue, never on the request path.",
    tradeoffs: [
      "Providers throttle: batch requests and spread bursts, or a viral event turns into a wall of 429s.",
      "Delivery is not guaranteed; track provider receipts and retry with backoff, and de-duplicate so a retry does not double-notify.",
      "User preferences and rate limits per user (no more than N per hour) live on your side, not the provider's.",
    ],
    questions: [
      "The provider is down for ten minutes. What happens to the notifications generated meanwhile?",
      "How do you avoid sending the same push twice after a retry?",
    ],
  },
  simulate(config, incoming) {
    const cap = num(config, "providerRateLimit", 5_000) * Math.max(1, num(config, "batchSize", 100));
    const { processed, dropped, util } = saturate(incoming.rps, cap);
    // Provider failures are retried with backoff; roughly a tenth stay undeliverable (bad tokens, unsubscribed).
    const fail = processed * num(config, "failureRate", 0.02);
    const lost = fail * 0.1;
    return result({
      processedRps: processed - lost,
      droppedRps: lost,
      rejectedRps: dropped,
      latency: latency(num(config, "latencyMs", 150), num(config, "latencyMs", 150) * 2, num(config, "latencyMs", 150) * 4),
      utilization: { provider: util },
      outgoing: [],
      notes: [
        `${str(config, "channel", "push")}: ${cap.toLocaleString()} messages/s (${num(config, "providerRateLimit", 5_000).toLocaleString()} req/s × ${num(config, "batchSize", 100)} per batch).`,
        dropped > 0 ? `${Math.round(dropped).toLocaleString()} msg/s throttled by the provider; queue and retry them.` : "Under the provider quota.",
        `${Math.round(num(config, "failureRate", 0.02) * 100)}% of sends fail at the provider and are retried; about ${Math.round(lost).toLocaleString()} msg/s stay undeliverable.`,
      ],
    });
  },
};

export const MORE_KINDS: ComponentKind[] = [
  apiGatewayKind,
  websocketGatewayKind,
  workerKind,
  taskQueueKind,
  searchIndexKind,
  geoIndexKind,
  idGeneratorKind,
  analyticsStoreKind,
  schedulerKind,
  notificationGatewayKind,
];
