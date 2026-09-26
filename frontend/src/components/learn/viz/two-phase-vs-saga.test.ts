import { describe, expect, it } from "vitest";

import { getViz } from "./registry";
import { twoPhaseVsSagaSteps, twoPhaseVsSagaViz } from "./two-phase-vs-saga";

const MODES = ["2pc", "saga"] as const;
const FAILS = ["none", "payment", "inventory"] as const;

describe("two-phase-vs-saga", () => {
  it("is registered and parses with per-field fallback", () => {
    expect(getViz("two-phase-vs-saga")).toBe(twoPhaseVsSagaViz);
    expect(twoPhaseVsSagaViz.parse({})).toEqual(twoPhaseVsSagaViz.defaults);
    expect(twoPhaseVsSagaViz.parse({ mode: "xyz", fail: 42 })).toEqual(twoPhaseVsSagaViz.defaults);
    expect(twoPhaseVsSagaViz.parse({ mode: "saga", fail: "bogus" })).toEqual({ mode: "saga", fail: "none" });
    expect(twoPhaseVsSagaViz.parse({ mode: null, fail: "inventory" })).toEqual({ mode: "2pc", fail: "inventory" });
  });

  it("produces well-formed, pure steps for every combination", () => {
    for (const mode of MODES) {
      for (const fail of FAILS) {
        const steps = twoPhaseVsSagaSteps({ mode, fail });
        expect(steps).toEqual(twoPhaseVsSagaSteps({ mode, fail }));
        expect(steps.length).toBeGreaterThan(2);
        expect(steps[0].kind).toBe("setup");
        expect(steps.some((step) => step.kind === "result")).toBe(true);
        for (const step of steps) {
          expect(step.interview.length).toBeGreaterThan(40);
          expect(step.explain.length).toBeGreaterThan(10);
          expect(step.state.participants.map((p) => p.id)).toEqual(["order", "payment", "inventory"]);
        }
      }
    }
  });

  it("2PC: prepare, votes with locks held, coordinator death blocks everyone, then commit", () => {
    const steps = twoPhaseVsSagaSteps({ mode: "2pc", fail: "none" });
    const titles = steps.map((step) => step.title);
    expect(titles.some((t) => t.includes("PREPARE"))).toBe(true);
    const votes = steps.find((step) => step.title.includes("votes YES"))!;
    expect(votes.state.participants.every((p) => p.note === "locks held")).toBe(true);
    const dead = steps.find((step) => step.title.includes("Coordinator dies"))!;
    expect(dead.kind).toBe("tradeoff");
    expect(dead.state.coordinatorTone).toBe("hot");
    expect(dead.state.participants.every((p) => p.status === "BLOCKED")).toBe(true);
    const commit = steps.find((step) => step.title.includes("COMMIT"))!;
    expect(commit.state.participants.every((p) => p.status === "committed")).toBe(true);
    expect(commit.state.locksHeld).toBe(0);
    const result = steps.at(-1)!;
    expect(result.kind).toBe("result");
    expect(result.title).toContain("blocking");
    expect(result.interview).toContain("atomicity");
  });

  it("2PC: one no vote aborts everyone and frees the locks", () => {
    for (const fail of ["payment", "inventory"] as const) {
      const steps = twoPhaseVsSagaSteps({ mode: "2pc", fail });
      const vote = steps.find((step) => step.title.includes("votes NO"))!;
      expect(vote.state.participants.find((p) => p.id === fail)!.status).toBe("voted NO");
      expect(vote.state.participants.filter((p) => p.id !== fail).every((p) => p.status === "voted YES")).toBe(true);
      expect(steps.some((step) => step.title.includes("ABORT"))).toBe(true);
      expect(steps.some((step) => step.title.includes("COMMIT"))).toBe(false);
      expect(steps.at(-1)!.state.participants.every((p) => p.status === "aborted")).toBe(true);
      expect(steps.at(-1)!.state.locksHeld).toBe(0);
    }
  });

  it("saga: each local transaction commits in order and the happy path ends confirmed", () => {
    const steps = twoPhaseVsSagaSteps({ mode: "saga", fail: "none" });
    const titles = steps.map((step) => step.title);
    expect(titles.findIndex((t) => t.startsWith("T1"))).toBeLessThan(titles.findIndex((t) => t.startsWith("T2")));
    expect(titles.findIndex((t) => t.startsWith("T2"))).toBeLessThan(titles.findIndex((t) => t.startsWith("T3")));
    expect(steps.every((step) => step.state.locksHeld === 0)).toBe(true);
    expect(steps.at(-1)!.state.compensations).toBe(0);
    expect(steps.at(-1)!.state.participants[0].status).toContain("CONFIRMED");
    expect(steps.at(-1)!.interview).toContain("idempotent");
  });

  it("saga: on failure, compensations run in reverse order", () => {
    const inventory = twoPhaseVsSagaSteps({ mode: "saga", fail: "inventory" });
    const titles = inventory.map((step) => step.title);
    const c2 = titles.findIndex((t) => t.startsWith("C2"));
    const c1 = titles.findIndex((t) => t.startsWith("C1"));
    expect(c2).toBeGreaterThan(-1);
    expect(c1).toBeGreaterThan(c2);
    expect(titles.some((t) => t.startsWith("T3: inventory fails"))).toBe(true);
    expect(inventory.at(-1)!.state.compensations).toBe(2);
    expect(inventory.at(-1)!.state.participants[0].status).toContain("CANCELLED");
    expect(inventory.some((step) => step.title.startsWith("C2") && step.interview.includes("idempotent"))).toBe(true);

    const payment = twoPhaseVsSagaSteps({ mode: "saga", fail: "payment" });
    const paymentTitles = payment.map((step) => step.title);
    expect(paymentTitles.some((t) => t.startsWith("T3"))).toBe(false);
    expect(paymentTitles.some((t) => t.startsWith("C2"))).toBe(false);
    expect(paymentTitles.some((t) => t.startsWith("C1"))).toBe(true);
    expect(payment.at(-1)!.state.compensations).toBe(1);
    expect(payment.at(-1)!.kind).toBe("result");
    expect(payment.at(-1)!.title).toContain("eventually consistent");
  });
});
