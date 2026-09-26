import { describe, expect, it } from "vitest";

import { cellOf, cellsAt, geohashSteps, geohashViz, neighboursOf, toPairs } from "./geohash";
import { getViz } from "./registry";

const DEFAULT_POINTS = [2, 3, 5, 12, 7, 7, 8, 5, 9, 8, 10, 6, 11, 9, 12, 4, 13, 13, 14, 1, 3, 9, 6, 2];

describe("geohash cells", () => {
  it("halves along alternating axes and grows the code by one character per split", () => {
    expect(cellsAt(0)).toEqual([{ code: "", x0: 0, y0: 0, w: 16, h: 16 }]);
    const one = cellsAt(1);
    expect(one.map((cell) => cell.code)).toEqual(["0", "1"]);
    expect(one[1]).toEqual({ code: "1", x0: 8, y0: 0, w: 8, h: 16 });
    const three = cellsAt(3);
    expect(three).toHaveLength(8);
    expect(three.every((cell) => cell.code.length === 3 && cell.w === 4 && cell.h === 8)).toBe(true);
    expect(cellOf(three, 9, 6)?.code).toBe("100");
    expect(cellOf(three, 9, 8)?.code).toBe("110");
  });

  it("shares a prefix with every cell inside the same bigger cell", () => {
    const parent = cellOf(cellsAt(2), 9, 6)!;
    const children = cellsAt(3).filter((cell) => cell.code.startsWith(parent.code));
    expect(children).toHaveLength(2);
    expect(children.every((cell) => cell.x0 >= parent.x0 && cell.x0 + cell.w <= parent.x0 + parent.w && cell.y0 === parent.y0)).toBe(true);
  });

  it("skips neighbours that fall off the edge of the map", () => {
    const cells = cellsAt(3);
    const corner = cellOf(cells, 0, 0)!;
    expect(neighboursOf(cells, corner).map((cell) => cell.code).sort()).toEqual(["001", "010", "011"]);
    const home = cellOf(cells, 9, 6)!;
    expect(neighboursOf(cells, home)).toHaveLength(5);
  });
});

describe("geohash steps", () => {
  it("is registered and its defaults survive parse", () => {
    const viz = getViz("geohash");
    expect(viz).toBe(geohashViz);
    expect(geohashViz.parse({})).toEqual(geohashViz.defaults);
  });

  it("walks setup, one split per precision, cell, neighbours, candidates, filter, result", () => {
    const steps = geohashSteps({ points: DEFAULT_POINTS, query: [9, 6], precision: 3, radius: 3 });
    expect(steps.map((step) => step.state.phase)).toEqual(["setup", "split", "split", "split", "query-cell", "neighbours", "candidates", "filter", "result"]);
    expect(steps.map((step) => step.state.queryCode)).toEqual(["", "1", "10", "100", "100", "100", "100", "100", "100"]);
    expect(steps[0].kind).toBe("setup");
    expect(steps.at(-1)!.kind).toBe("result");
    expect(steps.some((step) => step.kind === "tradeoff" && step.interview.includes("8 neighbours"))).toBe(true);
    for (const step of steps) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
  });

  it("finds the cross-border point through a neighbour cell and drops far candidates by exact distance", () => {
    const steps = geohashSteps({ points: DEFAULT_POINTS, query: [9, 6], precision: 3, radius: 3 });
    const points = toPairs(DEFAULT_POINTS);
    const candidates = steps.find((step) => step.state.phase === "candidates")!.state.candidates;
    const acrossBorder = points.findIndex((p) => p[0] === 9 && p[1] === 8);
    expect(candidates).toContain(acrossBorder);
    expect(candidates).not.toContain(points.findIndex((p) => p[0] === 2 && p[1] === 3));
    const result = steps.at(-1)!.state;
    expect(result.ranked.map((item) => points[item.index])).toEqual([
      [10, 6],
      [8, 5],
      [9, 8],
      [7, 7],
    ]);
    expect(result.dropped.length).toBeGreaterThan(0);
    expect(result.kept.length + result.dropped.length).toBe(candidates.length);
  });

  it("is pure and precision changes only the number of split frames", () => {
    const params = { points: DEFAULT_POINTS, query: [9, 6], precision: 1, radius: 3 };
    expect(geohashSteps(params)).toEqual(geohashSteps(params));
    expect(geohashSteps(params)).toHaveLength(7);
    expect(geohashSteps({ ...params, precision: 3 })).toHaveLength(9);
  });

  it("falls back per field on bad input instead of throwing", () => {
    expect(geohashViz.parse({ points: "x", query: "y", precision: "no", radius: null })).toEqual(geohashViz.defaults);
    const parsed = geohashViz.parse({ points: "1,2, 40,-3, 5", query: "3,4,9", precision: "9", radius: "0" });
    expect(parsed).toEqual({ points: [1, 2, 15, 0], query: [3, 4], precision: 3, radius: 1 });
    expect(() => geohashSteps(geohashViz.parse({ points: "7" }))).not.toThrow();
    const empty = geohashSteps({ points: [0, 0], query: [15, 15], precision: 3, radius: 1 });
    expect(empty.at(-1)!.state.ranked).toEqual([]);
    expect(empty.at(-1)!.title).toContain("No point");
  });
});
