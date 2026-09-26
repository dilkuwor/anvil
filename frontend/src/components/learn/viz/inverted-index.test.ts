import { describe, expect, it } from "vitest";

import { invertedIndexSteps, invertedIndexViz, normalise, stem, tokenise } from "./inverted-index";
import { getViz } from "./registry";

describe("inverted index", () => {
  it("is registered and passes the shared contract", () => {
    const viz = getViz("inverted-index")!;
    expect(viz).toBe(invertedIndexViz);
    const params = viz.parse({});
    expect(params).toEqual(viz.defaults);
    const first = viz.steps(params);
    const second = viz.steps(params);
    expect(first).toEqual(second);
    expect(first[0].kind).toBe("setup");
    expect(first[first.length - 1].kind).toBe("result");
    for (const step of first) {
      expect(step.interview.length).toBeGreaterThan(40);
      expect(step.explain.length).toBeGreaterThan(10);
    }
  });

  it("normalises words the same way for documents and queries", () => {
    expect(stem("running")).toBe("run");
    expect(stem("runs")).toBe("run");
    expect(stem("dogs")).toBe("dog");
    expect(stem("class")).toBe("class");
    expect(normalise("The")).toBeNull();
    expect(normalise("Park,")).toBe("park");
    expect(tokenise("The cat runs in the park")).toEqual(["cat", "run", "park"]);
  });

  it("builds sorted posting lists and intersects them for the query", () => {
    const steps = invertedIndexSteps(invertedIndexViz.defaults);
    const result = steps[steps.length - 1];
    expect(result.state.postings.map((posting) => posting.term)).toEqual([...result.state.postings.map((posting) => posting.term)].sort());
    const run = result.state.postings.find((posting) => posting.term === "run")!;
    const park = result.state.postings.find((posting) => posting.term === "park")!;
    expect(run.docs).toEqual([1, 2]);
    expect(park.docs).toEqual([1, 3]);
    expect(result.state.queryTerms).toEqual(["run", "park"]);
    expect(result.state.lookups).toEqual([[1, 2], [1, 3]]);
    expect(result.state.result).toEqual([1]);
    expect(result.title).toBe("Result: D1");
  });

  it("tokenises one document per step and indexes one document per step", () => {
    const steps = invertedIndexSteps({ docs: ["red blue", "blue green"], query: "blue green" });
    const tokeniseSteps = steps.filter((step) => step.title.startsWith("Tokenise"));
    const indexSteps = steps.filter((step) => step.title.startsWith("Add D"));
    expect(tokeniseSteps.map((step) => step.state.tokens)).toEqual([[["red", "blue"], null], [["red", "blue"], ["blue", "green"]]]);
    expect(indexSteps.map((step) => step.state.indexed)).toEqual([1, 2]);
    expect(indexSteps[0].state.postings).toEqual([{ term: "blue", docs: [1] }, { term: "red", docs: [1] }]);
    expect(indexSteps[1].state.postings).toEqual([{ term: "blue", docs: [1, 2] }, { term: "green", docs: [2] }, { term: "red", docs: [1] }]);
    expect(steps.some((step) => step.kind === "tradeoff")).toBe(true);
  });

  it("gives an empty result when a query term is missing from the index", () => {
    const steps = invertedIndexSteps({ docs: ["red apple", "green apple"], query: "apple pear" });
    const missing = steps.find((step) => step.title.startsWith('Look up "pear"'))!;
    expect(missing.explain).toContain("not in the dictionary");
    expect(steps[steps.length - 1].state.result).toEqual([]);
    expect(steps[steps.length - 1].title).toContain("no documents");
  });

  it("falls back per field instead of throwing", () => {
    const viz = invertedIndexViz;
    expect(viz.parse({ docs: 42, query: null })).toEqual(viz.defaults);
    expect(viz.parse({ docs: "", query: "the" })).toEqual(viz.defaults);
    expect(viz.parse({ docs: "one fish, two fish", query: "fish two extra" })).toEqual({ docs: ["one fish", "two fish"], query: "fish two" });
    expect(viz.parse({ docs: ["a", "b", "c", "d", "e"], query: "a" }).docs).toHaveLength(4);
    expect(viz.steps(viz.parse({ docs: ["only"], query: "only" }))[0].kind).toBe("setup");
  });

  it("does not mutate the params it is given", () => {
    const params = { docs: ["x y", "y z"], query: "y z" };
    const snapshot = JSON.parse(JSON.stringify(params));
    invertedIndexSteps(params);
    expect(params).toEqual(snapshot);
  });
});
