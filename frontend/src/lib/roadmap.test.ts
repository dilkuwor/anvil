import { describe, expect, it } from "vitest";

import type { ProblemListItem } from "@/lib/api";
import { hydrateRoadmap, recommendNextTopic, topicStatus } from "@/lib/roadmap";

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
