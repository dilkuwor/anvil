import { describe, expect, it } from "vitest";

import { getViz } from "./registry";
import { SNOWFLAKE_EPOCH, snowflakeId, snowflakeIdViz, snowflakeSteps } from "./snowflake-id";

const T = SNOWFLAKE_EPOCH + 5000;

describe("snowflake id", () => {
  it("is registered and satisfies the shared contract", () => {
    expect(getViz("snowflake-id")).toBe(snowflakeIdViz);
    expect(snowflakeIdViz.parse({})).toEqual(snowflakeIdViz.defaults);
    const steps = snowflakeSteps(snowflakeIdViz.defaults);
    expect(steps).toEqual(snowflakeSteps(snowflakeIdViz.defaults));
    expect(steps[0].kind).toBe("setup");
    expect(steps[steps.length - 1].kind).toBe("result");
    for (const step of steps) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
  });

  it("packs timestamp, machine and sequence into the right bit positions", () => {
    expect(snowflakeId(0, 0, 0)).toBe("0");
    expect(snowflakeId(0, 0, 5)).toBe("5");
    expect(snowflakeId(0, 1, 0)).toBe(String(2 ** 12));
    expect(snowflakeId(1, 0, 0)).toBe(String(2 ** 22));
    // 41-bit delta does not fit a double once shifted; BigInt keeps it exact.
    expect(snowflakeId(2 ** 41 - 1, 1023, 4095)).toBe("9223372036854775807");
  });

  it("resets the sequence on a new millisecond and counts up within one", () => {
    const steps = snowflakeSteps({ machineId: 3, timestamps: [T, T, T, T + 1] });
    const issued = steps[steps.length - 1].state.ids;
    expect(issued.map((entry) => entry.seq)).toEqual([0, 1, 2, 0]);
    expect(issued.map((entry) => entry.delta)).toEqual([5000, 5000, 5000, 5001]);
    expect(issued[0].id).toBe(snowflakeId(5000, 3, 0));
    const burst = steps.filter((step) => step.kind === "decision");
    expect(burst).toHaveLength(2);
    expect(burst[0].title).toContain("same ms");
  });

  it("refuses a request whose clock went backwards and keeps the last timestamp", () => {
    const steps = snowflakeSteps({ machineId: 1, timestamps: [T, T - 1, T + 2] });
    const rollback = steps.find((step) => step.kind === "tradeoff")!;
    expect(rollback.title).toContain("clock went back 1 ms");
    expect(rollback.state.refused).toBe(true);
    expect(rollback.state.lastTs).toBe(T);
    const result = steps[steps.length - 1];
    expect(result.state.ids.map((entry) => entry.refused)).toEqual([false, true, false]);
    expect(result.title).toContain("1 refused");
  });

  it("issues ids that sort by time", () => {
    const steps = snowflakeSteps(snowflakeIdViz.defaults);
    const ids = steps[steps.length - 1].state.ids.filter((entry) => !entry.refused).map((entry) => BigInt(entry.id));
    for (let i = 1; i < ids.length; i += 1) expect(ids[i] > ids[i - 1]).toBe(true);
    expect(steps[steps.length - 1].title).toContain("strictly increasing");
  });

  it("falls back per field and clamps out-of-range input instead of throwing", () => {
    expect(snowflakeIdViz.parse({ machineId: "x", timestamps: "a,b" })).toEqual(snowflakeIdViz.defaults);
    expect(snowflakeIdViz.parse({ machineId: 5000, timestamps: `${T}, 12` })).toEqual({ machineId: 1023, timestamps: [T, SNOWFLAKE_EPOCH] });
    expect(snowflakeIdViz.parse({ machineId: -4.7, timestamps: [T + 0.9] })).toEqual({ machineId: 0, timestamps: [T] });
    expect(() => snowflakeIdViz.parse({ machineId: null, timestamps: {} })).not.toThrow();
  });
});
