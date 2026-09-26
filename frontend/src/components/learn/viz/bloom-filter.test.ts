import { describe, expect, it } from "vitest";

import { bloomFilterSteps, bloomFilterViz, bloomHash, bloomIndexes } from "./bloom-filter";
import { getViz } from "./registry";

describe("bloom filter", () => {
  it("is registered and its defaults parse back to themselves", () => {
    expect(getViz("bloom-filter")).toBe(bloomFilterViz);
    expect(bloomFilterViz.parse({})).toEqual(bloomFilterViz.defaults);
  });

  it("hashes deterministically and differently per seed", () => {
    expect(bloomHash("pear", 0)).toBe(bloomHash("pear", 0));
    expect(bloomHash("pear", 0)).not.toBe(bloomHash("pear", 1));
    for (const index of bloomIndexes("anything", 6, 16)) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(16);
    }
  });

  it("shows one certain no, one true yes and one false positive with the defaults", () => {
    const steps = bloomFilterSteps(bloomFilterViz.defaults);
    expect(steps[0].kind).toBe("setup");
    expect(steps[0].state.bits.every((bit) => bit === 0)).toBe(true);
    const verdicts = steps[steps.length - 1].state.results.map((entry) => entry.verdict);
    expect(verdicts).toEqual(["absent", "present", "false-positive"]);
    expect(steps.filter((step) => step.kind === "tradeoff")).toHaveLength(1);
    expect(steps[steps.length - 1].kind).toBe("result");
    expect(steps[steps.length - 1].explain).toContain("false-positive rate");
    for (const step of steps) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
  });

  it("never clears a bit and never gives a false negative", () => {
    const params = bloomFilterViz.parse({ bits: 12, hashes: 2, inserts: "a, b, c, d", queries: "a, b, c, d, zzz" });
    const steps = bloomFilterSteps(params);
    let previous = steps[0].state.bits;
    for (const step of steps) {
      step.state.bits.forEach((bit, index) => expect(bit).toBeGreaterThanOrEqual(previous[index]));
      previous = step.state.bits;
    }
    const results = steps[steps.length - 1].state.results;
    for (const item of ["a", "b", "c", "d"]) {
      expect(results.find((entry) => entry.item === item)?.verdict).toBe("present");
    }
  });

  it("falls back per field on bad input instead of throwing", () => {
    expect(bloomFilterViz.parse({ bits: "lots", hashes: null, inserts: 42, queries: "" })).toEqual(bloomFilterViz.defaults);
    expect(bloomFilterViz.parse({ bits: "500", hashes: "0", inserts: "x,y" })).toEqual({ ...bloomFilterViz.defaults, bits: 64, hashes: 1, inserts: ["x", "y"] });
    expect(() => bloomFilterSteps(bloomFilterViz.parse({ bits: 4, hashes: 6, inserts: "one", queries: "one, two" }))).not.toThrow();
  });
});
