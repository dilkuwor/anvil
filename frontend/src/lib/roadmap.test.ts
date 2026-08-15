import { describe, expect, it } from "vitest";

import type { ProblemListItem } from "@/lib/api";
import {
  fitRoadmapView,
  hydrateRoadmap,
  readableRoadmapScale,
  recommendNextTopic,
  relatedTopicIds,
  roadmapEdgePath,
  topicStatus,
} from "@/lib/roadmap";

function problem(slug: string, tagSlugs: string[], status = "NOT_STARTED"): ProblemListItem {
  return {
    id: slug,
    title: slug,
    slug,
    difficulty: "EASY",
    tags: tagSlugs.map((tag) => ({ id: tag, name: tag, slug: tag })),
    status,
  };
}

describe("topicStatus", () => {
  it("treats full completion as completed", () => {
    expect(topicStatus(3, 3)).toBe("completed");
  });

  it("treats partial work as in progress", () => {
    expect(topicStatus(1, 4)).toBe("in_progress");
    expect(topicStatus(0, 4, true)).toBe("in_progress");
  });
});

describe("hydrateRoadmap", () => {
  it("counts unique matching problems from related tags", () => {
    const topics = hydrateRoadmap([
      problem("a", ["array", "hashmap"], "SOLVED"),
      problem("b", ["array"], "ATTEMPTED"),
      problem("c", ["tree"], "NOT_STARTED"),
    ]);
    const arrays = topics.find((topic) => topic.id === "arrays-hashing");
    expect(arrays?.solved).toBe(1);
    expect(arrays?.total).toBe(2);
    expect(arrays?.percent).toBe(50);
    expect(arrays?.status).toBe("in_progress");
  });
});

describe("readableRoadmapScale", () => {
  it("uses the available width without shrinking below a readable floor", () => {
    expect(readableRoadmapScale(1920)).toBeCloseTo(1.12);
    expect(readableRoadmapScale(400)).toBe(0.78);
    expect(readableRoadmapScale(1280)).toBeGreaterThanOrEqual(0.94);
  });
});

describe("fitRoadmapView", () => {
  it("scales so every node fits in the viewport", () => {
    const view = fitRoadmapView(1200, 800);
    expect(view.scale).toBeLessThan(1);
    expect(40 * view.scale + view.tx).toBeGreaterThanOrEqual(0);
    expect(1320 * view.scale + 276 * view.scale + view.tx).toBeLessThanOrEqual(1200 + 1);
    expect(40 * view.scale + view.ty).toBeGreaterThanOrEqual(0);
    expect(1216 * view.scale + 124 * view.scale + view.ty).toBeLessThanOrEqual(800 + 1);
  });
});

describe("roadmapEdgePath", () => {
  it("uses a smooth curve for adjacent edges", () => {
    const adjacent = roadmapEdgePath({ x: 40, y: 236 }, { x: 40, y: 432 });
    expect(adjacent).toContain("C");
    expect(adjacent.startsWith("M ")).toBe(true);
  });

  it("routes bit and math edges around the right of intervals and greedy", () => {
    const bit = roadmapEdgePath({ id: "arrays-hashing", x: 680, y: 40 }, { id: "bit-manipulation", x: 1320, y: 1020 });
    const math = roadmapEdgePath({ id: "arrays-hashing", x: 680, y: 40 }, { id: "math-geometry", x: 1320, y: 1216 });
    expect(bit).toContain("Q");
    expect(math).toContain("Q");
    expect(bit).toContain("1292");
    expect(math).toContain("1308");
  });
});

describe("relatedTopicIds", () => {
  it("includes the topic plus parents and children", () => {
    const ids = relatedTopicIds({
      id: "trees",
      title: "Trees",
      description: "",
      prerequisites: ["binary-search", "sliding-window"],
      next: ["heap"],
      relatedTags: [],
      filterTag: "tree",
      x: 0,
      y: 0,
    });
    expect([...ids].sort()).toEqual(["binary-search", "heap", "sliding-window", "trees"]);
  });
});

describe("recommendNextTopic", () => {
  it("prefers an unlocked in-progress topic with remaining work", () => {
    const topics = hydrateRoadmap([
      problem("a", ["array"], "SOLVED"),
      problem("b", ["two-pointers"], "ATTEMPTED"),
      problem("c", ["two-pointers"], "NOT_STARTED"),
    ]);
    const next = recommendNextTopic(topics);
    expect(next?.id).toBe("two-pointers");
  });
});
