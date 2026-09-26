import { describe, expect, it } from "vitest";

import { CDN_GAP_SECONDS, cdnEdgeSteps, cdnEdgeViz } from "./cdn-edge";

describe("cdn-edge", () => {
  it("parses with per-field fallbacks and never throws", () => {
    expect(cdnEdgeViz.parse({})).toEqual(cdnEdgeViz.defaults);
    expect(cdnEdgeViz.parse({ requests: 42, ttl: "abc", originMs: null, edgeMs: [] })).toEqual(cdnEdgeViz.defaults);
    expect(cdnEdgeViz.parse({ requests: "EU:a.js, US:a.js", ttl: "30" })).toEqual({ ...cdnEdgeViz.defaults, requests: ["EU:a.js", "US:a.js"], ttl: 30 });
    expect(cdnEdgeViz.parse({ ttl: -5 }).ttl).toBe(1);
  });

  it("misses per region, hits after the edge stores, and purges every edge", () => {
    const steps = cdnEdgeSteps(cdnEdgeViz.defaults);
    expect(steps[0].kind).toBe("setup");
    expect(steps.at(-1)!.kind).toBe("result");
    const titles = steps.map((step) => step.title);
    expect(titles).toContain("EU asks for logo.png: miss");
    expect(titles).toContain("EU edge stores logo.png");
    expect(titles).toContain("EU asks for logo.png: hit");
    expect(titles).toContain("US asks for logo.png: miss");
    expect(titles).toContain("Purge logo.png");
    expect(titles.indexOf("Purge logo.png")).toBeLessThan(titles.lastIndexOf("EU asks for logo.png: miss"));

    const firstMiss = steps.find((step) => step.title === "EU asks for logo.png: miss")!;
    expect(firstMiss.state.latencyMs).toBe(cdnEdgeViz.defaults.originMs + cdnEdgeViz.defaults.edgeMs);
    const hit = steps.find((step) => step.title === "EU asks for logo.png: hit")!;
    expect(hit.state.latencyMs).toBe(cdnEdgeViz.defaults.edgeMs);
    const otherRegion = steps.find((step) => step.title === "US asks for logo.png: miss")!;
    expect(otherRegion.kind).toBe("tradeoff");
    expect(otherRegion.interview).toContain("shield");

    const purge = steps.find((step) => step.title === "Purge logo.png")!;
    expect(purge.state.edge.EU).toEqual([]);
    expect(purge.state.edge.US).toEqual([]);
    expect(purge.state.purged).toEqual(["EU", "US"]);

    const result = steps.at(-1)!;
    expect(result.state.hits).toBe(2);
    expect(result.state.misses).toBe(3);
    expect(result.state.originFetches).toBe(3);
    expect(result.title).toContain("40%");
    expect(result.state.request).toBeNull();
  });

  it("expires an edge copy once the TTL has passed", () => {
    const steps = cdnEdgeSteps({ ...cdnEdgeViz.defaults, requests: ["EU:a.js", "EU:a.js", "EU:a.js"], ttl: CDN_GAP_SECONDS + 5 });
    const titles = steps.map((step) => step.title);
    expect(titles).toEqual(["Edge nodes in front of the origin", "EU asks for a.js: miss", "EU edge stores a.js", "EU asks for a.js: hit", "EU asks for a.js: expired", "EU edge stores a.js", expect.stringContaining("Edge hit ratio")]);
    expect(steps.find((step) => step.title === "EU asks for a.js: expired")!.kind).toBe("tradeoff");
  });

  it("is pure and keeps every frame's teaching text", () => {
    const params = cdnEdgeViz.parse({ requests: ["EU:x", "purge", "EU:x", "AP:x", "purge:x", "EU:x"] });
    const first = cdnEdgeSteps(params);
    expect(first).toEqual(cdnEdgeSteps(params));
    expect(first.some((step) => step.title === "Purge everything")).toBe(true);
    for (const step of first) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
    // Frames are snapshots: mutating a later frame's cache must not touch an earlier one.
    const stored = first.find((step) => step.title === "EU edge stores x")!;
    expect(stored.state.edge.EU).toHaveLength(1);
    expect(first[0].state.edge.EU).toHaveLength(0);
  });

  it("caps the number of regions at three", () => {
    const steps = cdnEdgeSteps(cdnEdgeViz.parse({ requests: ["A:f", "B:f", "C:f", "D:f", "A:f"] }));
    expect(steps[0].state.regions).toEqual(["A", "B", "C"]);
    expect(steps.some((step) => step.title.startsWith("D asks"))).toBe(false);
  });
});
