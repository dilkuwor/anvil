import { describe, expect, it } from "vitest";

import { getViz } from "./registry";
import { tlsHandshakeSteps, tlsHandshakeViz, tlsMessagePlan } from "./tls-handshake";

function firstByteStep(steps: ReturnType<typeof tlsHandshakeSteps>) {
  return steps.find((step) => step.state.ttfb !== null && step.state.secondTtfb === null)!;
}

describe("tls-handshake", () => {
  it("is registered and meets the shared contract", () => {
    expect(getViz("tls-handshake")).toBe(tlsHandshakeViz);
    for (const version of ["1.2", "1.3"] as const) {
      for (const resume of [false, true]) {
        const params = { version, rtt: 100, resume };
        const first = tlsHandshakeSteps(params);
        expect(first).toEqual(tlsHandshakeSteps(params));
        expect(first[0].kind).toBe("setup");
        expect(first[first.length - 1].kind).toBe("result");
        for (const step of first) {
          expect(step.interview.length).toBeGreaterThan(40);
          expect(step.explain.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("falls back per field on bad input instead of throwing", () => {
    expect(tlsHandshakeViz.parse({})).toEqual(tlsHandshakeViz.defaults);
    expect(tlsHandshakeViz.parse({ version: "1.1", rtt: "fast", resume: "maybe" })).toEqual(tlsHandshakeViz.defaults);
    expect(tlsHandshakeViz.parse({ version: "1.3", rtt: "200", resume: "true" })).toEqual({ version: "1.3", rtt: 200, resume: true });
    expect(tlsHandshakeViz.parse({ rtt: 0, resume: false })).toEqual({ ...tlsHandshakeViz.defaults, rtt: 1 });
  });

  it("TLS 1.2 cold: 4 round trips to the first byte, TLS 1.3 cold: 3", () => {
    const tls12 = tlsHandshakeSteps({ version: "1.2", rtt: 100, resume: false });
    const fb12 = firstByteStep(tls12);
    expect(fb12.state.ttfb).toBe(400);
    expect(fb12.state.roundTrips).toBe(4);
    expect(tls12.filter((step) => step.title.startsWith("TLS 1.2"))).toHaveLength(2);

    const tls13 = tlsHandshakeSteps({ version: "1.3", rtt: 100, resume: false });
    const fb13 = firstByteStep(tls13);
    expect(fb13.state.ttfb).toBe(300);
    expect(fb13.state.roundTrips).toBe(3);
    expect(tls13.filter((step) => step.title.startsWith("TLS 1.3"))).toHaveLength(1);
  });

  it("resumption: TLS 1.2 abbreviated is 3 round trips, TLS 1.3 0-RTT is 2 with a replay warning", () => {
    const tls12 = tlsHandshakeSteps({ version: "1.2", rtt: 100, resume: true });
    expect(firstByteStep(tls12).state.ttfb).toBe(300);
    expect(tls12.some((step) => step.kind === "tradeoff")).toBe(false);

    const tls13 = tlsHandshakeSteps({ version: "1.3", rtt: 100, resume: true });
    expect(firstByteStep(tls13).state.ttfb).toBe(200);
    expect(firstByteStep(tls13).state.roundTrips).toBe(2);
    const warning = tls13.find((step) => step.kind === "tradeoff")!;
    expect(warning.title).toContain("replayed");
    expect(warning.interview).toContain("idempotent");
  });

  it("the second request on the kept-alive connection costs exactly one round trip", () => {
    const steps = tlsHandshakeSteps({ version: "1.2", rtt: 200, resume: false });
    const second = steps.find((step) => step.title.startsWith("Second request"))!;
    expect(second.state.secondTtfb).toBe(200);
    expect(second.state.ttfb).toBe(800);
    const result = steps[steps.length - 1];
    expect(result.title).toBe("First byte: 800 ms cold, 200 ms warm");
    expect(result.state.messages).toHaveLength(10);
  });

  it("the clock and message count only move forward, and the plan leaves a gap row after the first byte", () => {
    const params = { version: "1.3", rtt: 50, resume: false } as const;
    const steps = tlsHandshakeSteps(params);
    let clock = -1;
    let count = -1;
    for (const step of steps) {
      expect(step.state.clock).toBeGreaterThanOrEqual(clock);
      expect(step.state.messages.length).toBeGreaterThanOrEqual(count);
      clock = step.state.clock;
      count = step.state.messages.length;
    }
    const plan = tlsMessagePlan(params);
    const firstByte = plan.findIndex((message) => message.firstByte);
    expect(plan[firstByte + 1].row).toBe(plan[firstByte].row + 2);
    expect(plan).toHaveLength(8);
    expect(plan[plan.length - 1].at).toBe(200);
  });
});
