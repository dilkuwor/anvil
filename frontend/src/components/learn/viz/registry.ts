import { binarySearchViz } from "./binary-search";
import { cacheAsideViz } from "./cache-aside";
import { circuitBreakerViz } from "./circuit-breaker";
import { consistentHashingViz } from "./consistent-hashing";
import { dijkstraViz } from "./dijkstra";
import { dp1dViz } from "./dp-1d";
import { fastSlowViz } from "./fast-slow";
import { graphTraversalViz } from "./graph-traversal";
import { idempotencyViz } from "./idempotency";
import { listReverseViz } from "./linked-list-reverse";
import { loadBalancingViz } from "./load-balancing";
import { mergeIntervalsViz } from "./merge-intervals";
import { monotonicStackViz } from "./monotonic-stack";
import { backpressureViz } from "./queue-backpressure";
import { quorumViz } from "./quorum";
import { replicationViz } from "./replication";
import { slidingWindowViz } from "./sliding-window";
import { tokenBucketViz } from "./token-bucket";
import { topKViz } from "./top-k-heap";
import { topologicalSortViz } from "./topological-sort";
import { treeTraversalViz } from "./tree-traversal";
import { unionFindViz } from "./union-find";
import { MORE_VIZ } from "./registry-more";
import type { AnyVizDefinition } from "./types";

/**
 * Lessons reference a visualizer by id on a single directive line:
 *
 *     :::viz sliding-window {"array": [2,3,1,2,4,3], "target": 7}
 *
 * Adding a visual is adding a definition here. Nothing else in the app needs to change.
 */
const DEFINITIONS: AnyVizDefinition[] = [
  // DSA
  slidingWindowViz,
  binarySearchViz,
  graphTraversalViz,
  monotonicStackViz,
  fastSlowViz,
  topKViz,
  unionFindViz,
  topologicalSortViz,
  dijkstraViz,
  dp1dViz,
  mergeIntervalsViz,
  treeTraversalViz,
  listReverseViz,
  // System design
  cacheAsideViz,
  consistentHashingViz,
  replicationViz,
  loadBalancingViz,
  backpressureViz,
  tokenBucketViz,
  idempotencyViz,
  quorumViz,
  circuitBreakerViz,
  ...MORE_VIZ,
];

const REGISTRY = new Map<string, AnyVizDefinition>(DEFINITIONS.map((definition) => [definition.id, definition]));

export type VizCategory = "dsa" | "system-design";

export type VizCatalogItem = {
  definition: AnyVizDefinition;
  category: VizCategory;
  categoryLabel: string;
  tags: string[];
};

const DSA_IDS = new Set([
  "sliding-window",
  "binary-search",
  "graph-traversal",
  "monotonic-stack",
  "fast-slow",
  "top-k-heap",
  "union-find",
  "topological-sort",
  "dijkstra",
  "dp-1d",
  "merge-intervals",
  "tree-traversal",
  "linked-list-reverse",
]);

const VIZ_TAGS: Record<string, string[]> = {
  "sliding-window": ["Two Pointers", "Subarray", "Optimization"],
  "binary-search": ["Divide & Conquer", "Sorted Array", "Logarithmic"],
  "graph-traversal": ["BFS", "DFS", "Queues", "Stacks"],
  "monotonic-stack": ["Stack", "Next Greater Element", "O(N)"],
  "fast-slow": ["Floyd's Cycle", "Linked List", "Pointers"],
  "top-k-heap": ["Min-Heap", "Streaming", "Priority Queue"],
  "union-find": ["Disjoint Sets", "Graph Components", "Path Compression"],
  "topological-sort": ["Kahn's Algorithm", "DAG", "In-Degree"],
  "dijkstra": ["Shortest Path", "Weighted Graph", "Greedy"],
  "dp-1d": ["Dynamic Programming", "Memoization", "House Robber"],
  "merge-intervals": ["Intervals", "Sorting", "Overlap"],
  "tree-traversal": ["Binary Tree", "In-Order", "Pre-Order", "Post-Order"],
  "linked-list-reverse": ["Pointers", "In-Place", "Linked List"],
  "cache-aside": ["Caching", "Redis", "Invalidation", "LRU"],
  "consistent-hashing": ["Distributed Hash Ring", "Virtual Nodes", "Sharding"],
  "replication": ["Primary-Follower", "Failover", "Sync vs Async"],
  "load-balancing": ["Round Robin", "Least Connections", "Routing"],
  "queue-backpressure": ["Kafka", "RabbitMQ", "Buffering", "Dropping"],
  "token-bucket": ["Rate Limiting", "Burst Handling", "Traffic Shaping"],
  "idempotency": ["Idempotency Keys", "Payment Flow", "Deduplication"],
  "quorum": ["Distributed Consensus", "W+R>N", "Eventual Consistency"],
  "circuit-breaker": ["Fault Tolerance", "State Machine", "Resilience"],
  architecture: ["Request Path", "Boxes & Arrows", "Case Studies"],
  "inverted-index": ["Search", "Posting Lists", "Tokenising"],
  "stream-window": ["Streaming", "Event Time", "Watermarks"],
  "snowflake-id": ["Unique IDs", "64-bit", "Time-Ordered"],
  "bloom-filter": ["Probabilistic", "Bit Array", "False Positives"],
  geohash: ["Geospatial", "Nearby Search", "Grid Cells"],
  "dns-resolution": ["DNS", "Caching", "TTL"],
  "tls-handshake": ["TLS", "Round Trips", "Latency"],
  "cdn-edge": ["CDN", "Edge Cache", "Origin"],
  "lsm-tree": ["Storage Engine", "Memtable", "SSTable"],
  "btree-lookup": ["Indexes", "B+ Tree", "Disk Pages"],
  "raft-election": ["Consensus", "Leader Election", "Terms"],
  "two-phase-vs-saga": ["Transactions", "2PC", "Saga"],
  "region-failover": ["Multi-Region", "Failover", "RPO / RTO"],
};

export function getVizCategory(id: string): VizCategory {
  return DSA_IDS.has(id.trim().toLowerCase()) ? "dsa" : "system-design";
}

export function listVizCatalog(): VizCatalogItem[] {
  return DEFINITIONS.map((definition) => {
    const isDsa = DSA_IDS.has(definition.id);
    return {
      definition,
      category: isDsa ? "dsa" : "system-design",
      categoryLabel: isDsa ? "Algorithms & DSA" : "System Design",
      tags: VIZ_TAGS[definition.id] ?? [],
    };
  });
}

export function getViz(id: string): AnyVizDefinition | undefined {
  return REGISTRY.get(id.trim().toLowerCase());
}

export function listViz(): AnyVizDefinition[] {
  return [...REGISTRY.values()];
}

export type VizDirective = { id: string; params: Record<string, unknown> };

/**
 * Parses a visualizer directive. Lessons write it as one line, `:::viz <id> {json?}`;
 * the leading colons are optional so the info string of a fence parses too.
 * Returns null when the text is not a viz directive.
 */
export function parseVizDirective(info: string): VizDirective | null {
  const trimmed = info.trim().replace(/^:::\s*/, "");
  if (!/^viz(\s|$)/i.test(trimmed)) return null;
  const rest = trimmed.replace(/^viz\s*/i, "");
  const match = rest.match(/^([a-z0-9-]+)\s*(\{[\s\S]*\})?\s*$/i);
  if (!match) return { id: rest.split(/\s+/)[0] ?? "", params: {} };
  let params: Record<string, unknown> = {};
  if (match[2]) {
    try {
      const parsed = JSON.parse(match[2]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) params = parsed as Record<string, unknown>;
    } catch {
      params = {};
    }
  }
  return { id: match[1].toLowerCase(), params };
}
