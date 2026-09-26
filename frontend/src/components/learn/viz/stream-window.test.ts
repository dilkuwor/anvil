import { describe, expect, it } from "vitest";

import { getViz } from "./registry";
import { streamWindowSteps, streamWindowViz } from "./stream-window";

const DEFAULT_EVENTS = ["1:4", "3:2", "2:5", "6:1", "5:3", "8:2", "4:7", "9:1", "13:2", "10:2", "12:4"];

describe("stream-window", () => {
  it("is registered and every step carries teaching text", () => {
    expect(getViz("stream-window")).toBe(streamWindowViz);
    const params = streamWindowViz.parse({});
    expect(params).toEqual(streamWindowViz.defaults);
    const first = streamWindowViz.steps(params);
    const second = streamWindowViz.steps(params);
    expect(first).toEqual(second);
    expect(first[0].kind).toBe("setup");
    expect(first.at(-1)!.kind).toBe("result");
    for (const step of first) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
  });

  it("buckets by event time, closes windows on the watermark, and drops what is too late", () => {
    const steps = streamWindowSteps({ events: DEFAULT_EVENTS, windowSec: 5, lateness: 2 });
    const last = steps.at(-1)!;
    expect(last.state.emitted).toEqual([
      { start: 0, end: 5, count: 3, sum: 11 },
      { start: 5, end: 10, count: 4, sum: 7 },
    ]);
    expect(last.state.dropped).toBe(1);
    expect(last.state.events[6].status).toBe("dropped");
    // 2:5 arrives after 3:2 but still lands in the first window.
    const outOfOrder = steps.find((step) => step.title.startsWith("t=2:"));
    expect(outOfOrder?.title).toContain("out of order");
    expect(outOfOrder?.state.windows[0].count).toBe(3);
    // 10:2 is behind the watermark (11) but its window is open, so it counts.
    const late = steps.find((step) => step.title.startsWith("t=10:"));
    expect(late?.title).toContain("late but accepted");
    expect(last.state.events[9].status).toBe("late");
    // The drop is a trade-off step; the window close is a decision step.
    expect(steps.find((step) => step.title.startsWith("t=4:"))?.kind).toBe("tradeoff");
    expect(steps.some((step) => step.kind === "decision" && step.title.startsWith("Watermark 6 passes 5"))).toBe(true);
  });

  it("watermark trails the newest event time by the lateness and never goes backwards", () => {
    const steps = streamWindowSteps({ events: DEFAULT_EVENTS, windowSec: 5, lateness: 2 });
    let previous = 0;
    for (const step of steps) {
      expect(step.state.watermark).toBe(Math.max(0, step.state.maxSeen - 2));
      expect(step.state.watermark).toBeGreaterThanOrEqual(previous);
      previous = step.state.watermark;
    }
  });

  it("a larger lateness keeps the late event instead of dropping it", () => {
    const tight = streamWindowSteps({ events: ["1:1", "8:1", "4:1"], windowSec: 5, lateness: 2 }).at(-1)!;
    expect(tight.state.dropped).toBe(1);
    expect(tight.state.emitted).toEqual([{ start: 0, end: 5, count: 1, sum: 1 }]);
    const loose = streamWindowSteps({ events: ["1:1", "8:1", "4:1"], windowSec: 5, lateness: 4 }).at(-1)!;
    expect(loose.state.dropped).toBe(0);
    expect(loose.state.windows[0].count).toBe(2);
  });

  it("falls back per field on bad input instead of throwing", () => {
    expect(streamWindowViz.parse({ events: "nope, 3", windowSec: "x", lateness: null })).toEqual(streamWindowViz.defaults);
    expect(streamWindowViz.parse({ events: "2:1, junk, 7:3", windowSec: "4", lateness: -5 })).toEqual({ events: ["2:1", "7:3"], windowSec: 4, lateness: 0 });
    expect(streamWindowViz.parse({ events: ["1:1", "2:2"], windowSec: 999 }).windowSec).toBe(60);
  });
});
