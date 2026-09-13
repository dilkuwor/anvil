import { describe, expect, it } from "vitest";

import { binarySearchSteps } from "./binary-search";
import { cacheAsideSteps } from "./cache-aside";
import { consistentHashingSteps, hashAngle } from "./consistent-hashing";
import { graphTraversalSteps } from "./graph-traversal";
import { getViz, listViz, parseVizDirective } from "./registry";
import { slidingWindowSteps } from "./sliding-window";

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
    expect(ids).toEqual(["sliding-window", "binary-search", "graph-traversal", "cache-aside", "consistent-hashing"]);
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
