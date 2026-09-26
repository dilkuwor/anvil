import { describe, expect, it } from "vitest";

import { lsmTreeSteps, lsmTreeViz, parseWrite } from "./lsm-tree";

describe("lsm-tree", () => {
  it("parses with per-field fallbacks and never throws", () => {
    expect(lsmTreeViz.parse({})).toEqual(lsmTreeViz.defaults);
    expect(lsmTreeViz.parse({ writes: 7, memtableSize: "big", read: 3 })).toEqual(lsmTreeViz.defaults);
    expect(lsmTreeViz.parse({ writes: "x=1, y=2", memtableSize: "2", read: "y" })).toEqual({ writes: ["x=1", "y=2"], memtableSize: 2, read: "y" });
    expect(lsmTreeViz.parse({ memtableSize: 99 }).memtableSize).toBe(4);
    expect(parseWrite("=")).toEqual({ key: "k", value: "1" });
    expect(parseWrite("longkey=longvalue")).toEqual({ key: "lon", value: "lon" });
  });

  it("appends to the log, keeps the memtable sorted, and flushes when full", () => {
    const steps = lsmTreeSteps(lsmTreeViz.defaults);
    expect(steps[0].kind).toBe("setup");
    expect(steps.at(-1)!.kind).toBe("result");
    const writeC = steps.find((step) => step.title === "Write c=3")!;
    expect(writeC.state.log.map((entry) => `${entry.key}=${entry.value}`)).toEqual(["a=1", "b=2", "c=3"]);
    expect(writeC.state.memtable.map((row) => row.key)).toEqual(["a", "b", "c"]);

    const flush1 = steps.find((step) => step.title === "Memtable full: flush to SSTable 1")!;
    expect(flush1.kind).toBe("decision");
    expect(flush1.state.memtable).toEqual([]);
    expect(flush1.state.tables).toHaveLength(1);
    expect(flush1.state.tables[0].rows.map((row) => row.key)).toEqual(["a", "b", "c"]);
    expect(flush1.state.log.every((entry) => entry.flushed)).toBe(true);

    const flush2 = steps.find((step) => step.title === "Memtable full: flush to SSTable 2")!;
    expect(flush2.state.tables).toHaveLength(2);
    expect(flush2.state.tables[1].rows).toEqual([
      { key: "a", value: "4" },
      { key: "d", value: "5" },
      { key: "e", value: "6" },
    ]);
  });

  it("reads memtable first, skips a file by Bloom filter, and finds the key in the older file", () => {
    const steps = lsmTreeSteps(lsmTreeViz.defaults);
    const titles = steps.map((step) => step.title);
    const notInMem = titles.indexOf("Read b: not in the memtable");
    const skip = titles.indexOf("Bloom filter: b is not in SSTable 2");
    const found = titles.indexOf("Read b: found b=2 in SSTable 1");
    expect(notInMem).toBeGreaterThan(0);
    expect(skip).toBeGreaterThan(notInMem);
    expect(found).toBeGreaterThan(skip);
    expect(steps[found].state.read).toEqual({ key: "b", at: 1, skipped: [2], found: { value: "2", where: 1 }, done: true });
  });

  it("finds the newest version of a key in the newest file", () => {
    const steps = lsmTreeSteps({ ...lsmTreeViz.defaults, read: "a" });
    const found = steps.find((step) => step.title.startsWith("Read a: found"))!;
    expect(found.title).toBe("Read a: found a=4 in SSTable 2");
    expect(steps.some((step) => step.title.startsWith("Bloom filter"))).toBe(false);
  });

  it("finds a key still in the memtable, and reports a missing key as the worst case", () => {
    const inMemory = lsmTreeSteps({ writes: ["a=1", "b=2"], memtableSize: 3, read: "b" });
    expect(inMemory.some((step) => step.title === "Read b: found in the memtable")).toBe(true);
    expect(inMemory.some((step) => step.title.startsWith("Compaction"))).toBe(false);
    const missing = lsmTreeSteps({ ...lsmTreeViz.defaults, read: "z" });
    const notFound = missing.find((step) => step.title === "Read z: not found anywhere")!;
    expect(notFound.kind).toBe("tradeoff");
    expect(notFound.state.read?.skipped).toEqual([2, 1]);
  });

  it("compaction merges two files and drops the old version", () => {
    const steps = lsmTreeSteps(lsmTreeViz.defaults);
    const compact = steps.find((step) => step.title.startsWith("Compaction"))!;
    expect(compact.kind).toBe("tradeoff");
    expect(compact.state.tables).toHaveLength(1);
    expect(compact.state.tables[0].rows).toEqual([
      { key: "a", value: "4" },
      { key: "b", value: "2" },
      { key: "c", value: "3" },
      { key: "d", value: "5" },
      { key: "e", value: "6" },
    ]);
    expect(compact.state.dropped).toEqual([{ key: "a", value: "1" }]);
    expect(steps.at(-1)!.explain).toContain("dropped 1 old version");
  });

  it("is pure and keeps every frame's teaching text", () => {
    const params = lsmTreeViz.parse({ writes: "k=1, k=2, k=3, k=4", memtableSize: 2, read: "" });
    const first = lsmTreeSteps(params);
    expect(first).toEqual(lsmTreeSteps(params));
    expect(first.some((step) => step.title.startsWith("Read"))).toBe(false);
    for (const step of first) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
    // Rewriting the same key replaces it in the memtable instead of growing it.
    const second = first.find((step) => step.title === "Write k=2")!;
    expect(second.state.memtable).toEqual([{ key: "k", value: "2" }]);
    expect(second.state.log).toHaveLength(2);
    // Frames are snapshots.
    expect(first[0].state.log).toHaveLength(0);
  });
});
