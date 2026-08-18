import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { SimulatorSample } from "@/lib/interview";
import { runSimulation } from "../engine/run";
import { designFromSample } from "./samples";

const samplesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../../backend/app/interviews/samples");

function loadSamples(): SimulatorSample[] {
  return readdirSync(samplesDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(samplesDir, name), "utf8")) as SimulatorSample);
}

describe("catalog samples", () => {
  const samples = loadSamples();

  it("includes a graph for every known problem", () => {
    expect(samples.map((item) => item.slug).sort()).toEqual([
      "autocomplete",
      "chat-system",
      "news-feed",
      "rate-limiter",
      "ride-sharing",
      "twitter-feed",
      "url-shortener",
      "video-streaming",
      "web-crawler",
    ]);
  });

  it.each(samples)("$slug hydrates into a connected graph that can simulate", (sample) => {
    const design = designFromSample(sample);
    expect(design.nodes.some((node) => node.type === "client")).toBe(true);
    expect(design.edges.length).toBeGreaterThan(0);
    const result = runSimulation({ design, failures: [] });
    expect(result.throughput.incomingRps).toBeGreaterThan(0);
    expect(result.cost.total).toBeGreaterThan(0);
    const wired = new Set(design.edges.flatMap((edge) => [edge.source, edge.target]));
    expect(design.nodes.every((node) => wired.has(node.id))).toBe(true);
  });
});
