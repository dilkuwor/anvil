import { describe, expect, it } from "vitest";

import { btreeLookupSteps, btreeLookupViz, buildBTree } from "./btree-lookup";

const KEYS = [3, 8, 12, 17, 21, 26, 30, 35, 41, 47, 52, 58];

describe("btree-lookup", () => {
  it("builds a balanced B+ tree with every key in a leaf and separators above", () => {
    const tree = buildBTree(KEYS, 3);
    expect(tree.leaves).toHaveLength(4);
    expect(tree.depth).toBe(2);
    expect(tree.leaves.flatMap((id) => tree.nodes[id].keys)).toEqual(KEYS);
    expect(tree.nodes[tree.root].keys).toEqual([17, 30, 47]);
    for (const id of tree.leaves) expect(tree.nodes[id].level).toBe(0);
    const deeper = buildBTree(KEYS, 2);
    expect(deeper.depth).toBe(3);
    expect(deeper.leaves).toHaveLength(6);
  });

  it("walks root to leaf, one page per level, and finds the key", () => {
    const steps = btreeLookupSteps({ keys: KEYS, fanout: 3, find: 35 });
    expect(steps[0].kind).toBe("setup");
    expect(steps.at(-1)!.kind).toBe("result");
    const leaf = steps.find((step) => step.state.phase === "leaf")!;
    expect(leaf.state.found).toBe(true);
    expect(leaf.state.pagesRead).toBe(2);
    expect(leaf.state.path).toEqual(["inner-1-1", "leaf-3"]);
    const decisions = steps.filter((step) => step.kind === "decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].state.pointer).toBe(2);
    expect(steps.at(-1)!.title).toContain("O(log n)");
    expect(steps).toEqual(btreeLookupSteps({ keys: KEYS, fanout: 3, find: 35 }));
  });

  it("reports a miss at the same page cost and still scans the leaf chain", () => {
    const steps = btreeLookupSteps({ keys: KEYS, fanout: 3, find: 36 });
    const leaf = steps.find((step) => step.state.phase === "leaf")!;
    expect(leaf.state.found).toBe(false);
    expect(leaf.state.missing).toBe(true);
    expect(leaf.state.pagesRead).toBe(2);
    const linked = steps.find((step) => step.state.link !== null)!;
    expect(linked.state.link).toEqual(["leaf-3", "leaf-4"]);
    expect(linked.state.scanned).toEqual([41, 47, 52, 58]);
    expect(linked.state.pagesRead).toBe(3);
  });

  it("stops the scan on the last leaf and handles a key above every key", () => {
    const steps = btreeLookupSteps({ keys: KEYS, fanout: 3, find: 99 });
    expect(steps.some((step) => step.title.startsWith("Last leaf"))).toBe(true);
    expect(steps.every((step) => step.state.link === null)).toBe(true);
    const tiny = btreeLookupSteps({ keys: [5, 9], fanout: 3, find: 5 });
    expect(tiny[0].title).toContain("1 level");
    expect(tiny.find((step) => step.state.phase === "leaf")!.state.pagesRead).toBe(1);
  });

  it("parses per field, sorts and dedupes keys, and never throws", () => {
    expect(btreeLookupViz.parse({})).toEqual(btreeLookupViz.defaults);
    expect(btreeLookupViz.parse({ keys: "9, 1, 9, 4", fanout: "2", find: "4" })).toEqual({ keys: [1, 4, 9], fanout: 2, find: 4 });
    expect(btreeLookupViz.parse({ keys: "a,b", fanout: 99, find: "x" })).toEqual({ ...btreeLookupViz.defaults, fanout: 4 });
    expect(btreeLookupViz.parse({ keys: null, fanout: null, find: null })).toEqual(btreeLookupViz.defaults);
  });
});
