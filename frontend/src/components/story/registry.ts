import { binaryTreeLevelOrderStory } from "./stories/binary-tree-level-order";
import { coinChangeStory } from "./stories/coin-change";
import { containerWithMostWaterStory } from "./stories/container-with-most-water";
import { courseScheduleStory } from "./stories/course-schedule";
import { dailyTemperaturesStory } from "./stories/daily-temperatures";
import { kokoEatingBananasStory } from "./stories/koko-eating-bananas";
import { largestRectangleInHistogramStory } from "./stories/largest-rectangle-in-histogram";
import { linkedListCycleStory } from "./stories/linked-list-cycle";
import { longestCommonSubsequenceStory } from "./stories/longest-common-subsequence";
import { longestUniqueSubstringStory } from "./stories/longest-unique-substring";
import { lowestCommonAncestorStory } from "./stories/lowest-common-ancestor";
import { lruCacheStory } from "./stories/lru-cache";
import { mergeIntervalsStory } from "./stories/merge-intervals";
import { minimumWindowSubstringStory } from "./stories/minimum-window-substring";
import { numberOfIslandsStory } from "./stories/number-of-islands";
import { reverseLinkedListStory } from "./stories/reverse-linked-list";
import { reverseNodesInKGroupStory } from "./stories/reverse-nodes-in-k-group";
import { rottingOrangesStory } from "./stories/rotting-oranges";
import { searchRotatedArrayStory } from "./stories/search-rotated-array";
import { threeSumStory } from "./stories/three-sum";
import { trappingRainWaterStory } from "./stories/trapping-rain-water";
import type { AnyProblemStory } from "./types";
import { AGY_STORIES } from "./registry-agy";
import { GROK_STORIES } from "./registry-grok";
import { MS_STORIES } from "./registry-ms";

/**
 * Complete catalog of visual stories across Phase 1, Phase 2, and Phase 3.
 */
const STORIES: AnyProblemStory[] = [
  longestUniqueSubstringStory,
  containerWithMostWaterStory,
  linkedListCycleStory,
  dailyTemperaturesStory,
  numberOfIslandsStory,
  trappingRainWaterStory,
  searchRotatedArrayStory,
  lruCacheStory,
  coinChangeStory,
  threeSumStory,
  kokoEatingBananasStory,
  mergeIntervalsStory,
  reverseLinkedListStory,
  reverseNodesInKGroupStory,
  minimumWindowSubstringStory,
  largestRectangleInHistogramStory,
  binaryTreeLevelOrderStory,
  lowestCommonAncestorStory,
  rottingOrangesStory,
  courseScheduleStory,
  longestCommonSubsequenceStory,
];

// The second wave of stories lives in one file per author so nobody edits this list concurrently.
const ALL_STORIES: AnyProblemStory[] = [...STORIES, ...GROK_STORIES, ...AGY_STORIES, ...MS_STORIES];

const BY_SLUG = new Map<string, AnyProblemStory>(
  ALL_STORIES.flatMap((story) => story.slugs.map((slug) => [slug, story] as const))
);

export function hasStory(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function getStory(slug: string): AnyProblemStory | null {
  return BY_SLUG.get(slug) ?? null;
}

export function listStories(): AnyProblemStory[] {
  return ALL_STORIES;
}
