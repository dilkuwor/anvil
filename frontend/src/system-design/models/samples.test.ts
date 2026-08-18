import { describe, expect, it } from "vitest";

import { runSimulation } from "../engine/run";
import { buildUrlShortenerSample } from "./samples";

describe("URL Shortener sample", () => {
  it("builds a connected graph that can simulate", () => {
    const design = buildUrlShortenerSample();
    expect(design.nodes.map((node) => node.type)).toEqual([
      "client",
      "dns",
      "rate_limiter",
      "load_balancer",
      "api_server",
      "redis",
      "postgresql",
      "kafka",
    ]);
    expect(design.edges.length).toBe(7);
    const result = runSimulation({ design, failures: [] });
    expect(result.throughput.incomingRps).toBeGreaterThan(1000);
    expect(result.nodes.cache.incomingRps).toBeGreaterThan(0);
    expect(result.nodes.db.incomingRps).toBeGreaterThan(0);
    expect(result.cost.total).toBeGreaterThan(0);
  });
});
