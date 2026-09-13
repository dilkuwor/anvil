import { describe, expect, it } from "vitest";

import { binarySearchSteps } from "./binary-search";
import { cacheAsideSteps } from "./cache-aside";
import { consistentHashingSteps, hashAngle } from "./consistent-hashing";
import { graphTraversalSteps } from "./graph-traversal";
import { getViz, listViz, parseVizDirective } from "./registry";
import { slidingWindowSteps } from "./sliding-window";
import { monotonicStackSteps } from "./monotonic-stack";
import { fastSlowSteps } from "./fast-slow";
import { topKSteps } from "./top-k-heap";
import { unionFindSteps } from "./union-find";
import { topologicalSortSteps } from "./topological-sort";
import { dijkstraSteps } from "./dijkstra";
import { dp1dSteps } from "./dp-1d";
import { mergeIntervalsSteps } from "./merge-intervals";
import { treeTraversalSteps } from "./tree-traversal";
import { listReverseSteps } from "./linked-list-reverse";
import { replicationSteps } from "./replication";
import { loadBalancingSteps } from "./load-balancing";
import { backpressureSteps } from "./queue-backpressure";
import { tokenBucketSteps } from "./token-bucket";
import { idempotencySteps } from "./idempotency";
import { quorumSteps } from "./quorum";
import { circuitBreakerSteps } from "./circuit-breaker";

describe("viz registry", () => {
  it("parses the fence info string with optional JSON params", () => {
    expect(parseVizDirective("viz sliding-window")).toEqual({ id: "sliding-window", params: {} });
    expect(parseVizDirective(':::viz sliding-window {"target": 3}')).toEqual({ id: "sliding-window", params: { target: 3 } });
    expect(parseVizDirective('viz binary-search {"target": 9, "variant": "first"}')).toEqual({ id: "binary-search", params: { target: 9, variant: "first" } });
    expect(parseVizDirective("viz cache-aside {not json}")).toEqual({ id: "cache-aside", params: {} });
    expect(parseVizDirective("java")).toBeNull();
  });

  it("registers every visualizer with fields, defaults, and a pure step function", () => {
    const ids = listViz().map((definition) => definition.id);
    expect(ids).toHaveLength(22);
    expect(ids).toEqual(expect.arrayContaining(["sliding-window", "binary-search", "graph-traversal", "cache-aside", "consistent-hashing", "monotonic-stack", "fast-slow", "top-k-heap", "union-find", "topological-sort", "dijkstra", "dp-1d", "merge-intervals", "tree-traversal", "linked-list-reverse", "replication", "load-balancing", "queue-backpressure", "token-bucket", "idempotency", "quorum", "circuit-breaker"]));
    for (const definition of listViz()) {
      const params = definition.parse({});
      expect(params).toEqual(definition.defaults);
      const first = definition.steps(params);
      const second = definition.steps(params);
      expect(first).toEqual(second);
      expect(first.length).toBeGreaterThan(2);
      expect(first[0].kind).toBe("setup");
      expect(first.some((step) => step.kind === "result")).toBe(true);
      for (const step of first) {
        expect(step.interview.length).toBeGreaterThan(40);
        expect(step.explain.length).toBeGreaterThan(10);
      }
    }
    expect(getViz("nope")).toBeUndefined();
  });

  it("falls back per field on bad input instead of throwing", () => {
    const viz = getViz("sliding-window")!;
    expect(viz.parse({ array: "a,b", target: "x" })).toEqual(viz.defaults);
    expect(viz.parse({ array: "5, 1, 3", target: "4" })).toEqual({ array: [5, 1, 3], target: 4 });
  });
});

describe("sliding window", () => {
  it("finds the shortest window and keeps the left pointer monotone", () => {
    const steps = slidingWindowSteps({ array: [2, 3, 1, 2, 4, 3], target: 7 });
    const result = steps.find((step) => step.kind === "result")!;
    expect(result.state.best).toEqual({ left: 4, right: 5 });
    let left = 0;
    for (const step of steps) {
      expect(step.state.left).toBeGreaterThanOrEqual(left);
      left = step.state.left;
    }
    expect(steps.some((step) => step.kind === "tradeoff")).toBe(false);
  });

  it("flags the negative-number trap as a trade-off step", () => {
    const steps = slidingWindowSteps({ array: [2, -1, 3, 4], target: 5 });
    const trap = steps.find((step) => step.kind === "tradeoff");
    expect(trap?.interview).toContain("monotone");
  });
});

describe("binary search", () => {
  it("halves the range and states the invariant in the exact variant", () => {
    const steps = binarySearchSteps({ array: [1, 3, 4, 4, 4, 7, 9, 12, 15], target: 4, variant: "exact" });
    expect(steps[0].title).toContain("Invariant");
    const result = steps[steps.length - 1];
    expect(result.kind).toBe("result");
    expect(result.state.found).toBe(4);
    for (let i = 1; i < steps.length; i += 1) {
      const prev = steps[i - 1].state;
      const next = steps[i].state;
      expect(next.hi - next.lo).toBeLessThanOrEqual(prev.hi - prev.lo);
    }
  });

  it("finds the first index in the boundary variant and explains lo < hi", () => {
    const steps = binarySearchSteps({ array: [1, 3, 4, 4, 4, 7, 9, 12, 15], target: 4, variant: "first" });
    const result = steps[steps.length - 1];
    expect(result.state.found).toBe(2);
    expect(steps.some((step) => step.interview.includes("lo < hi"))).toBe(true);
    const missing = binarySearchSteps({ array: [1, 3, 5], target: 9, variant: "first" });
    expect(missing[missing.length - 1].state.found).toBeNull();
    expect(missing[missing.length - 1].state.lo).toBe(3);
  });
});

describe("graph traversal", () => {
  const edges = ["A-B", "A-C", "B-D", "C-D", "C-E", "D-F", "E-F"];

  it("BFS visits by depth and marks on enqueue", () => {
    const steps = graphTraversalSteps({ edges, start: "A", mode: "bfs" });
    const result = steps[steps.length - 1];
    expect(result.state.order).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(result.state.depth).toEqual({ A: 0, B: 1, C: 1, D: 2, E: 2, F: 3 });
    expect(steps[0].interview).toContain("enters the queue exactly once");
    expect(steps.every((step) => new Set(step.state.frontier).size === step.state.frontier.length)).toBe(true);
  });

  it("DFS uses a stack, skips duplicates, and has no depth guarantee", () => {
    const steps = graphTraversalSteps({ edges, start: "A", mode: "dfs" });
    const result = steps[steps.length - 1];
    expect(result.state.order[0]).toBe("A");
    expect(new Set(result.state.order).size).toBe(6);
    expect(steps.some((step) => step.title.includes("already visited"))).toBe(true);
    expect(result.interview).toContain("DFS when");
  });
});

describe("cache-aside", () => {
  it("tracks hits, misses, LRU eviction, and invalidation on write", () => {
    const steps = cacheAsideSteps({ ops: ["R:a", "R:a", "R:b", "R:c", "W:a", "R:a"], capacity: 2, writePolicy: "invalidate" });
    const titles = steps.map((step) => step.title);
    expect(titles).toContain("Read a: miss");
    expect(titles).toContain("Read a: hit");
    expect(titles).toContain("Evict a (least recently used)");
    expect(titles.some((title) => title.startsWith("Write a"))).toBe(true);
    const result = steps[steps.length - 1];
    expect(result.state.hits).toBe(1);
    expect(result.state.misses).toBe(4);
    expect(result.interview).toContain("stampede");
  });

  it("serves a stale hit when a write goes through without invalidation on another key path", () => {
    const steps = cacheAsideSteps({ ops: ["R:a", "W:a", "R:a"], capacity: 2, writePolicy: "write-through" });
    const through = steps.find((step) => step.title.includes("through"));
    expect(through?.kind).toBe("tradeoff");
    const last = steps.filter((step) => step.title.startsWith("Read a")).pop();
    expect(last?.title).toBe("Read a: hit");
    expect(last?.state.cacheVersion.a).toBe(2);
  });
});

describe("consistent hashing", () => {
  it("hashes deterministically and moves only the keys in the new node's arc", () => {
    expect(hashAngle("user:7")).toBe(hashAngle("user:7"));
    const params = { nodes: ["N1", "N2", "N3"], keys: ["user:7", "user:19", "post:3", "post:44", "cart:5", "cart:61", "feed:2", "feed:90"], add: "N4", virtual: 1 };
    const steps = consistentHashingSteps(params);
    const result = steps[steps.length - 1];
    const moved = result.state.keys.filter((key) => key.moved);
    expect(moved.every((key) => key.owner === "N4")).toBe(true);
    expect(moved.length).toBeLessThan(result.state.keys.length);
    const baseline = steps.find((step) => step.title.startsWith("Baseline"));
    expect(baseline?.kind).toBe("tradeoff");
    expect(baseline?.interview).toContain("mod N");
  });

  it("uses virtual nodes when asked", () => {
    const steps = consistentHashingSteps({ nodes: ["N1", "N2"], keys: ["a", "b", "c"], add: "N3", virtual: 4 });
    expect(steps[0].state.ring).toHaveLength(8);
    expect(steps[steps.length - 1].interview).toContain("virtual nodes");
  });
});

describe("DSA visualizers compute the right answers", () => {
  it("monotonic stack: next greater element", () => {
    const last = monotonicStackSteps({ array: [2, 1, 5, 6, 2, 3] }).at(-1)!;
    expect(last.state.result).toEqual([5, 5, 6, null, 3, null]);
  });
  it("fast-slow: finds the cycle entry, or reports no cycle", () => {
    const withCycle = fastSlowSteps({ length: 7, cycleStart: 3 }).at(-1)!;
    expect(withCycle.state.entry).toBe(3);
    const none = fastSlowSteps({ length: 5, cycleStart: -1 }).at(-1)!;
    expect(none.title).toContain("no cycle");
  });
  it("top-k: keeps the k largest", () => {
    const last = topKSteps({ stream: [5, 1, 9, 3, 7, 2, 8, 6], k: 3 }).at(-1)!;
    expect([...last.state.heap].sort((a, b) => a - b)).toEqual([7, 8, 9]);
  });
  it("union-find: components and cycle edges", () => {
    const steps = unionFindSteps({ n: 7, ops: ["U:0-1", "U:2-3", "U:1-3", "U:4-5", "F:0", "U:5-6", "U:3-6", "U:0-6"] });
    expect(steps.at(-1)!.state.components).toBe(1);
    expect(steps.some((s) => s.title.includes("same set"))).toBe(true);
  });
  it("topological sort: valid order and cycle detection", () => {
    const ok = topologicalSortSteps({ edges: ["A>B", "A>C", "B>D", "C>D", "D>E", "F>C"] }).at(-1)!;
    const pos = Object.fromEntries(ok.state.order.map((n, i) => [n, i]));
    for (const [a, b] of [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["D", "E"], ["F", "C"]]) expect(pos[a]).toBeLessThan(pos[b]);
    const cyc = topologicalSortSteps({ edges: ["A>B", "B>C", "C>A"] }).at(-1)!;
    expect(cyc.state.cycle).toBe(true);
    expect(cyc.kind).toBe("tradeoff");
  });
  it("dijkstra: distances, and a negative-edge warning", () => {
    const last = dijkstraSteps({ edges: ["A-B:4", "A-C:1", "C-B:2", "B-D:5", "C-D:8", "D-E:3", "C-E:10"], start: "A" }).at(-1)!;
    expect(last.state.dist).toEqual({ A: 0, B: 3, C: 1, D: 8, E: 11 });
    expect(dijkstraSteps({ edges: ["A-B:-1"], start: "A" }).at(-1)!.kind).toBe("tradeoff");
  });
  it("dp-1d: house robber value and reconstruction", () => {
    const last = dp1dSteps({ values: [2, 7, 9, 3, 1] }).at(-1)!;
    expect(last.state.dp.at(-1)).toBe(12);
    expect(last.state.chosen).toEqual([0, 2, 4]);
  });
  it("merge intervals", () => {
    const last = mergeIntervalsSteps({ intervals: ["1-3", "8-10", "2-6", "15-18", "17-20", "6-7"] }).at(-1)!;
    expect(last.state.merged).toEqual([[1, 7], [8, 10], [15, 20]]);
  });
  it("tree traversals: all three orders", () => {
    const tree = ["8", "3", "10", "1", "6", "null", "14"];
    expect(treeTraversalSteps({ tree, order: "in" }).at(-1)!.state.visited).toEqual(["1", "3", "6", "8", "10", "14"]);
    expect(treeTraversalSteps({ tree, order: "pre" }).at(-1)!.state.visited).toEqual(["8", "3", "1", "6", "10", "14"]);
    expect(treeTraversalSteps({ tree, order: "post" }).at(-1)!.state.visited).toEqual(["1", "6", "3", "14", "10", "8"]);
  });
  it("linked list reverse", () => {
    const last = listReverseSteps({ values: [1, 2, 3, 4, 5] }).at(-1)!;
    expect(last.title).toContain("New head: 5");
    expect(last.explain).toContain("5 → 4 → 3 → 2 → 1");
  });
});

describe("System design visualizers", () => {
  it("replication: async loses the write on failover, sync does not", () => {
    const async = replicationSteps({ mode: "async", followers: 2 });
    expect(async.some((s) => s.kind === "tradeoff" && s.title.startsWith("Promote"))).toBe(true);
    expect(async.at(-1)!.title).toContain("lost");
    const sync = replicationSteps({ mode: "sync", followers: 2 });
    expect(sync.at(-1)!.kind).toBe("result");
    expect(sync.at(-1)!.title).not.toContain("lost");
  });
  it("load balancing: least-connections spreads long requests", () => {
    const rr = loadBalancingSteps({ algorithm: "round_robin", servers: 2, durations: [4, 1, 1, 4, 1, 1] });
    const lc = loadBalancingSteps({ algorithm: "least_connections", servers: 2, durations: [4, 1, 1, 4, 1, 1] });
    const peak = (steps: ReturnType<typeof loadBalancingSteps>) => Math.max(...steps.map((s) => Math.max(...s.state.active.map((a) => a.length))));
    expect(peak(lc)).toBeLessThanOrEqual(peak(rr));
  });
  it("backpressure: backlog grows then drains after scaling", () => {
    const steps = backpressureSteps({ producerRate: 1000, consumerRate: 300, consumers: 2, addConsumersAt: 6, seconds: 12, bound: 0 });
    const history = steps.at(-1)!.state.history;
    expect(Math.max(...history)).toBeGreaterThan(0);
    expect(history.at(-1)).toBeLessThan(Math.max(...history));
    const bounded = backpressureSteps({ producerRate: 1000, consumerRate: 300, consumers: 2, addConsumersAt: 0, seconds: 6, bound: 500 });
    expect(bounded.at(-1)!.state.dropped).toBeGreaterThan(0);
  });
  it("token bucket allows a burst up to capacity and the window comparison differs", () => {
    const last = tokenBucketSteps({ capacity: 3, refillPerSec: 2, requests: [0, 0.1, 0.2, 0.3, 0.9, 1.0, 1.1, 1.2, 2.5, 2.6] }).at(-1)!;
    expect(last.state.decisions.slice(0, 3)).toEqual(["allow", "allow", "allow"]);
    expect(last.state.decisions[3]).toBe("deny");
    expect(last.kind).toBe("result");
    const steps = tokenBucketSteps({ capacity: 3, refillPerSec: 2, requests: [0, 0.1, 0.2, 0.3, 0.9, 1.0, 1.1, 1.2, 2.5, 2.6] });
    expect(steps.at(-2)!.kind).toBe("tradeoff");
  });
  it("idempotency: one charge with a key, two without", () => {
    expect(idempotencySteps({ mode: "without" }).at(-1)!.state.ledger).toHaveLength(2);
    expect(idempotencySteps({ mode: "with" }).at(-1)!.state.ledger).toHaveLength(1);
  });
  it("quorum: overlap when W + R > N, stale read otherwise", () => {
    const good = quorumSteps({ n: 3, w: 2, r: 2 });
    expect(good.some((s) => s.state.result === 2)).toBe(true);
    const bad = quorumSteps({ n: 3, w: 1, r: 1 });
    expect(bad.some((s) => s.state.result === 1 && s.kind === "tradeoff")).toBe(true);
  });
  it("circuit breaker: trips, half-opens, closes", () => {
    const steps = circuitBreakerSteps({ threshold: 3, cooldown: 2, calls: ["ok", "fail", "fail", "fail", "ok", "ok", "wait", "wait", "ok", "ok", "fail"] });
    const statuses = steps.map((s) => s.state.status);
    expect(statuses).toContain("open");
    expect(statuses).toContain("half-open");
    expect(steps.some((s) => s.state.outcome === "rejected")).toBe(true);
    expect(steps.at(-1)!.state.status).toBe("closed");
  });
});
