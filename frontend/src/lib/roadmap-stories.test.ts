import { describe, expect, it } from "vitest";

import { getStory } from "@/components/story/registry";

import { ROADMAP_TOPICS } from "./roadmap";
import {
  KEYSTONE_STORIES,
  getKeystoneBySlug,
  getPrimaryKeystone,
  getTopicKeystones,
  recommendNextKeystone,
} from "./roadmap-stories";

describe("roadmap-stories catalog", () => {
  it("contains exactly 21 keystones with unique slugs and contiguous order", () => {
    expect(KEYSTONE_STORIES).toHaveLength(21);
    const slugs = KEYSTONE_STORIES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(21);

    const orders = KEYSTONE_STORIES.map((s) => s.order);
    expect(orders).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
  });

  it("assigns every keystone to a valid roadmap topic", () => {
    const topicIds = new Set(ROADMAP_TOPICS.map((t) => t.id));
    for (const story of KEYSTONE_STORIES) {
      expect(topicIds.has(story.topicId)).toBe(true);
      expect(story.metaphor).toBeTruthy();
      expect(story.trap).toBeTruthy();
      expect(story.insight).toBeTruthy();
    }
  });

  it("shows the same metaphor and trap name the story itself teaches", () => {
    for (const keystone of KEYSTONE_STORIES) {
      const story = getStory(keystone.slug);
      expect(story, `no Visual Story for ${keystone.slug}`).toBeTruthy();
      expect(keystone.metaphor).toBe(story!.metaphor.name);
      expect(keystone.trap).toBe(story!.traps[0].name);
    }
  });

  it("ensures every topic with keystones has exactly one primary keystone", () => {
    const topicsWithKeystones = new Set(KEYSTONE_STORIES.map((s) => s.topicId));
    for (const topicId of topicsWithKeystones) {
      const primaries = getTopicKeystones(topicId).filter((s) => s.isPrimary);
      expect(primaries).toHaveLength(1);
      expect(getPrimaryKeystone(topicId)).toBe(primaries[0]);
    }
  });

  it("ensures all prereqSlugs reference valid preceding keystones", () => {
    for (const story of KEYSTONE_STORIES) {
      if (story.prereqSlug) {
        const prereq = getKeystoneBySlug(story.prereqSlug);
        expect(prereq).toBeDefined();
        expect(prereq!.order).toBeLessThan(story.order);
      }
    }
  });
});

describe("recommendNextKeystone", () => {
  it("recommends the initial root keystone when no stories are completed", () => {
    const next = recommendNextKeystone({});
    expect(next?.slug).toBe("lc-146"); // First topic without prerequisites
  });

  it("recommends downstream keystone only after prerequisite is recalled", () => {
    // lc-146 recalled
    let next = recommendNextKeystone({ "lc-146": { watched: true, recalled: true } });
    expect(next?.slug).toBe("lc-11"); // Two Pointers primary

    // lc-11 only watched, not recalled -> next is still lc-11
    next = recommendNextKeystone({
      "lc-146": { watched: true, recalled: true },
      "lc-11": { watched: true, recalled: false },
    });
    expect(next?.slug).toBe("lc-11");

    // lc-11 recalled -> next unlocks lc-15 (3Sum)
    next = recommendNextKeystone({
      "lc-146": { watched: true, recalled: true },
      "lc-11": { watched: true, recalled: true },
    });
    expect(next?.slug).toBe("lc-15");
  });

  it("returns null when all 21 keystones are recalled", () => {
    const allRecalled: Record<string, { watched: boolean; recalled: boolean }> = {};
    for (const story of KEYSTONE_STORIES) {
      allRecalled[story.slug] = { watched: true, recalled: true };
    }
    expect(recommendNextKeystone(allRecalled)).toBeNull();
  });
});
