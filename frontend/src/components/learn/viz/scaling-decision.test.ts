import { describe, expect, it } from "vitest";

import { getViz } from "./registry";
import { scalingDecisionSteps, scalingDecisionViz } from "./scaling-decision";

describe("scaling-decision", () => {
  it("is registered and parses with per-field fallback", () => {
    expect(getViz("scaling-decision")).toBe(scalingDecisionViz);
    expect(scalingDecisionViz.parse({})).toEqual(scalingDecisionViz.defaults);
    expect(
      scalingDecisionViz.parse({ writes: "x", reads: null, hitRate: 7 }),
    ).toEqual({ ...scalingDecisionViz.defaults, hitRate: 1 });
    expect(
      scalingDecisionViz.parse({ writes: 20000, reads: 50000, hitRate: 0.9 }),
    ).toEqual({ writes: 20000, reads: 50000, hitRate: 0.9 });
  });

  it("stops at the baseline when neither writes nor reads cross a threshold", () => {
    const steps = scalingDecisionSteps({
      writes: 400,
      reads: 3000,
      hitRate: 0.9,
    });
    expect(steps).toEqual(
      scalingDecisionSteps({ writes: 400, reads: 3000, hitRate: 0.9 }),
    );
    expect(steps[0].kind).toBe("setup");
    const last = steps.at(-1)!;
    expect(last.kind).toBe("result");
    expect(last.title).toContain("One node is comfortable");
    expect(last.state.nodes.find((n) => n.id === "baseline")!.tone).toBe("ok");
    expect(last.state.nodes.find((n) => n.id === "s1")!.tone).toBe("idle");
    expect(last.state.plan.join(" ")).toContain("no cache and no replicas");
  });

  it("scales writes first, then caches repeated reads, then sizes the cache", () => {
    const steps = scalingDecisionSteps({
      writes: 20000,
      reads: 500000,
      hitRate: 0.9,
    });
    const titles = steps.map((s) => s.title);
    expect(
      titles.some((t) => t.startsWith("Yes: the write path must change first")),
    ).toBe(true);
    expect(titles.findIndex((t) => t.includes("write path"))).toBeLessThan(
      titles.findIndex((t) => t.includes("cache in front")),
    );
    const cluster = steps.find((s) => s.title.includes("cache cluster"))!;
    expect(cluster.state.nodes.find((n) => n.id === "s4")!.detail).toContain(
      "cluster of ~5",
    );
    const last = steps.at(-1)!;
    expect(
      last.state.nodes.filter((n) => n.tone === "ok").map((n) => n.id),
    ).toEqual(
      expect.arrayContaining(["q1", "s1", "q2", "c1", "s2", "q3", "s4"]),
    );
    expect(last.state.plan.join(" ")).toContain("shard by key");
    expect(last.state.plan.join(" ")).toContain("Redis Cluster");
  });

  it("chooses replicas over a cache when reads do not repeat", () => {
    const steps = scalingDecisionSteps({
      writes: 1000,
      reads: 40000,
      hitRate: 0.3,
    });
    const replicas = steps.find((s) => s.title.includes("read replicas"))!;
    expect(replicas.kind).toBe("tradeoff");
    expect(replicas.state.nodes.find((n) => n.id === "s3")!.detail).toContain(
      "3 replicas",
    );
    expect(steps.some((s) => s.title.includes("cache in front"))).toBe(false);
    expect(steps.at(-1)!.state.plan.join(" ")).toContain("read replicas");
  });

  it("keeps every step sayable", () => {
    for (const params of [
      { writes: 1500, reads: 40000, hitRate: 0.85 },
      { writes: 6000, reads: 2000, hitRate: 0.5 },
      { writes: 100, reads: 12000, hitRate: 0.8 },
    ]) {
      for (const step of scalingDecisionSteps(params)) {
        expect(step.interview.length).toBeGreaterThan(40);
        expect(step.explain.length).toBeGreaterThan(10);
        expect(step.explain).not.toMatch(/NaN|undefined/);
      }
    }
  });
});
