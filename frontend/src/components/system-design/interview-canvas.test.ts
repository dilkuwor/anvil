import { describe, expect, it } from "vitest";

import { fromDesignGraph, toDesignGraph } from "./interview-canvas";

describe("interview canvas graph translation", () => {
  it("maps legacy plain parts onto simulator parts with their default settings", () => {
    const design = toDesignGraph({
      nodes: [
        { id: "a", type: "client", label: "Users", x: 0, y: 0 },
        { id: "b", type: "cache", label: "Cache", x: 100, y: 0 },
        { id: "c", type: "database", label: "", x: 200, y: 0 },
        { id: "z", type: "spaceship", label: "Nope", x: 300, y: 0 },
      ],
      edges: [
        { id: "e1", from: "a", to: "b" },
        { id: "e2", from: "b", to: "z" },
      ],
    });
    expect(design.nodes.map((node) => node.type)).toEqual(["client", "redis", "postgresql"]);
    expect(design.nodes[1].config.memoryGb).toBeDefined();
    expect(design.nodes[2].label).toBe("PostgreSQL");
    expect(design.edges).toEqual([{ id: "e1", source: "a", target: "b", label: undefined, weight: undefined }]);
  });

  it("keeps simulator parts, settings and edge weights when saving back", () => {
    const graph = fromDesignGraph(
      [
        { id: "n1", type: "kafka", label: "Events", x: 10.4, y: 20.6, config: { brokers: 3 }, disabled: true },
        { id: "n2", type: "worker", label: "Workers", x: 0, y: 0, config: {} },
      ],
      [{ id: "e", source: "n1", target: "n2", label: "pull", weight: 0.5 }],
    );
    expect(graph.nodes[0]).toEqual({ id: "n1", type: "kafka", label: "Events", x: 10, y: 21, config: { brokers: 3 }, disabled: true });
    expect(graph.nodes[1]).toEqual({ id: "n2", type: "worker", label: "Workers", x: 0, y: 0, config: {} });
    expect(graph.edges).toEqual([{ id: "e", from: "n1", to: "n2", label: "pull", weight: 0.5 }]);
    const back = toDesignGraph(graph);
    expect(back.nodes[0].config.brokers).toBe(3);
    expect(back.edges[0].weight).toBe(0.5);
  });
});
