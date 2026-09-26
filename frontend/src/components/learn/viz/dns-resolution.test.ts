import { describe, expect, it } from "vitest";

import { DNS_ANSWER, dnsResolutionSteps, dnsResolutionViz, splitHostname } from "./dns-resolution";
import { getViz } from "./registry";

describe("dns-resolution", () => {
  it("is registered and meets the shared contract", () => {
    expect(getViz("dns-resolution")).toBe(dnsResolutionViz);
    const params = dnsResolutionViz.parse({});
    expect(params).toEqual(dnsResolutionViz.defaults);
    const first = dnsResolutionViz.steps(params);
    expect(first).toEqual(dnsResolutionViz.steps(params));
    expect(first[0].kind).toBe("setup");
    expect(first.some((step) => step.kind === "result")).toBe(true);
    for (const step of first) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
  });

  it("falls back per field on bad input instead of throwing", () => {
    expect(dnsResolutionViz.parse({ hostname: 42, warm: "maybe", ttl: "abc" })).toEqual(dnsResolutionViz.defaults);
    expect(dnsResolutionViz.parse({ hostname: "nodots", ttl: -5 })).toEqual({ ...dnsResolutionViz.defaults, ttl: 1 });
    expect(dnsResolutionViz.parse({ hostname: " Shop.Example.ORG ", warm: "true", ttl: "60" })).toEqual({ hostname: "shop.example.org", warm: true, ttl: 60 });
    expect(dnsResolutionViz.parse({ warm: false })).toEqual({ ...dnsResolutionViz.defaults, warm: false });
    expect(splitHostname("api.example.com")).toEqual({ tld: "com", zone: "example.com" });
  });

  it("cold: walks root, TLD and authoritative, 4 round trips, then a free repeat", () => {
    const steps = dnsResolutionSteps({ hostname: "api.example.com", warm: false, ttl: 300 });
    const titles = steps.map((step) => step.title);
    expect(titles).toContain("Browser cache: miss");
    expect(titles).toContain("Resolver cache: miss, ask a root server");
    expect(titles).toContain("Root: referral to .com");
    expect(titles).toContain("TLD: referral to example.com");
    expect(titles).toContain(`Answer: ${DNS_ANSWER}, TTL 300 s`);

    const answer = steps.find((step) => step.title.startsWith("Answer:"))!;
    expect(answer.state.clientTrips + answer.state.resolverTrips).toBe(4);
    expect(answer.state.status.auth).toBe("answered");
    expect(answer.state.edges[0]).toMatchObject({ from: "auth", to: "resolver", kind: "answer" });

    const cached = steps.find((step) => step.title.startsWith("Cached"))!;
    expect(cached.state.status).toMatchObject({ browser: "cached", os: "cached", resolver: "cached" });

    expect(steps.some((step) => step.kind === "tradeoff" && step.title.includes("cannot invalidate"))).toBe(true);

    const repeat = steps.find((step) => step.title.startsWith("Second lookup"))!;
    expect(repeat.state.lookup).toBe(2);
    expect(repeat.state.clientTrips + repeat.state.resolverTrips).toBe(0);
    expect(repeat.state.ttlLeft).toBe(290);
    expect(repeat.state.edges).toEqual([]);

    const result = steps[steps.length - 1];
    expect(result.kind).toBe("result");
    expect(result.title).toContain("4 round trips");
  });

  it("warm: the resolver answers at once and root/TLD are never asked", () => {
    const steps = dnsResolutionSteps({ hostname: "api.example.com", warm: true, ttl: 300 });
    const titles = steps.map((step) => step.title);
    expect(titles).toContain("Resolver cache: hit");
    expect(titles.some((title) => title.startsWith("Root"))).toBe(false);
    expect(steps.every((step) => step.state.status.root === "idle" && step.state.status.auth === "idle")).toBe(true);
    const hit = steps.find((step) => step.title === "Resolver cache: hit")!;
    expect(hit.state.clientTrips).toBe(1);
    expect(hit.state.resolverTrips).toBe(0);
    expect(hit.state.ttlLeft).toBe(200);
    expect(steps[steps.length - 1].title).toContain("1 round trip");
  });

  it("counts round trips up, never down, within a lookup", () => {
    const steps = dnsResolutionSteps({ hostname: "www.example.co", warm: false, ttl: 5 });
    let previous = 0;
    for (const step of steps) {
      if (step.state.lookup !== 1) break;
      const total = step.state.clientTrips + step.state.resolverTrips;
      expect(total).toBeGreaterThanOrEqual(previous);
      previous = total;
    }
    const repeat = steps.find((step) => step.state.lookup === 2)!;
    expect(repeat.state.ttlLeft).toBe(3);
  });
});
