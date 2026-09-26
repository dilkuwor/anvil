import { describe, expect, it } from "vitest";

import { regionFailoverSteps, regionFailoverViz } from "./region-failover";
import { getViz } from "./registry";

describe("region-failover", () => {
  it("is registered and parses with per-field fallback", () => {
    expect(getViz("region-failover")).toBe(regionFailoverViz);
    expect(regionFailoverViz.parse({})).toEqual(regionFailoverViz.defaults);
    expect(regionFailoverViz.parse({ mode: "weird", lagSeconds: "abc", failover: 7 })).toEqual(regionFailoverViz.defaults);
    expect(regionFailoverViz.parse({ mode: "sync", lagSeconds: "12", failover: "manual" })).toEqual({ mode: "sync", lagSeconds: 12, failover: "manual" });
    expect(regionFailoverViz.parse({ lagSeconds: -3 })).toEqual({ ...regionFailoverViz.defaults, lagSeconds: 1 });
    expect(regionFailoverViz.parse({ lagSeconds: 99999 })).toEqual({ ...regionFailoverViz.defaults, lagSeconds: 600 });
    expect(regionFailoverViz.parse({ lagSeconds: 2.6 })).toEqual({ ...regionFailoverViz.defaults, lagSeconds: 3 });
  });

  it("produces well-formed, pure steps for every combination", () => {
    for (const mode of ["async", "sync"] as const) {
      for (const failover of ["auto", "manual"] as const) {
        const params = { mode, lagSeconds: 5, failover };
        const steps = regionFailoverSteps(params);
        expect(steps).toEqual(regionFailoverSteps(params));
        expect(steps.length).toBeGreaterThan(2);
        expect(steps[0].kind).toBe("setup");
        expect(steps.at(-1)!.kind).toBe("result");
        for (const step of steps) {
          expect(step.interview.length).toBeGreaterThan(40);
          expect(step.explain.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("walks through failure, flip with TTL, promotion, and reconnect in order", () => {
    const steps = regionFailoverSteps({ mode: "async", lagSeconds: 5, failover: "auto" });
    const titles = steps.map((step) => step.title);
    const fail = titles.findIndex((t) => t.includes("primary region fails"));
    const flip = titles.findIndex((t) => t.includes("traffic manager flips"));
    const promote = titles.findIndex((t) => t.includes("Promote"));
    const reconnect = titles.findIndex((t) => t.includes("reconnect"));
    expect(fail).toBeGreaterThan(0);
    expect(flip).toBeGreaterThan(fail);
    expect(promote).toBeGreaterThan(flip);
    expect(reconnect).toBeGreaterThan(promote);
    expect(steps[fail].state.primary.up).toBe(false);
    expect(steps[fail].state.manager.target).toBe("primary");
    expect(steps[flip].state.manager.target).toBe("secondary");
    expect(steps[flip].explain).toContain("TTL");
    expect(steps[promote].state.secondary.role).toBe("new primary");
    expect(steps[promote].state.secondary.dbNote).toContain("promoted");
    expect(steps[promote].interview).toContain("split-brain");
    expect(steps[reconnect].state.users.tone).toBe("ok");
  });

  it("async loses the lag window; sync loses nothing but says writes were slower", () => {
    const async = regionFailoverSteps({ mode: "async", lagSeconds: 8, failover: "auto" });
    const lost = async.find((step) => step.title.includes("lag window is lost"))!;
    expect(lost.kind).toBe("tradeoff");
    expect(lost.title).toContain("8 seconds");
    expect(lost.state.lostSeconds).toBe(8);
    expect(async.at(-1)!.explain).toContain("8 seconds");

    const sync = regionFailoverSteps({ mode: "sync", lagSeconds: 8, failover: "auto" });
    expect(sync.some((step) => step.title.includes("lag window is lost"))).toBe(false);
    const slower = sync.find((step) => step.title.includes("Nothing is lost"))!;
    expect(slower.kind).toBe("invariant");
    expect(sync.at(-1)!.state.lostSeconds).toBe(0);
    expect(sync.at(-1)!.explain).toContain("zero");
  });

  it("manual failover is slower and says a person decided", () => {
    const auto = regionFailoverSteps({ mode: "async", lagSeconds: 5, failover: "auto" });
    const manual = regionFailoverSteps({ mode: "async", lagSeconds: 5, failover: "manual" });
    expect(auto.some((step) => step.title.includes("on its own"))).toBe(true);
    expect(manual.some((step) => step.title.includes("on-call"))).toBe(true);
    expect(manual.at(-1)!.explain).toContain("person");
    expect(auto.at(-1)!.explain).not.toContain("person");
    expect(auto.at(-1)!.explain).toContain("RPO");
    expect(auto.at(-1)!.explain).toContain("RTO");
  });
});
