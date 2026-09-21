import { maximumDepthOfBinaryTreeStory } from "./stories/maximum-depth-of-binary-tree";
import type { AnyProblemStory } from "./types";
import { AGY_TREES1_STORIES } from "./registry-agy-trees1";
import { AGY_TREES2_STORIES } from "./registry-agy-trees2";
import { AGY_TREES3_STORIES } from "./registry-agy-trees3";
import { AGY_HEAP_STORIES } from "./registry-agy-heap";
import { AGY_GRIDS_STORIES } from "./registry-agy-grids";
import { AGY_GRAPHS1_STORIES } from "./registry-agy-graphs1";
import { AGY_GRAPHS2_STORIES } from "./registry-agy-graphs2";
import { AGY_CHOICES_STORIES } from "./registry-agy-choices";
import { AGY_BOARDS_STORIES } from "./registry-agy-boards";
import { AGY_DP1_STORIES } from "./registry-agy-dp1";
import { AGY_DP2_STORIES } from "./registry-agy-dp2";
import { AGY_DP3_STORIES } from "./registry-agy-dp3";
import { AGY_GROUPS_STORIES } from "./registry-agy-groups";
import { AGY_DESIGN1_STORIES } from "./registry-agy-design1";
import { AGY_DESIGN2_STORIES } from "./registry-agy-design2";

/**
 * Stories written by agy. Only agy edits this file, so two tools can add stories at the
 * same time without touching the same lines. `registry.ts` gathers every part.
 *
 * Add one import per story and list it in the array, in the order you finish them.
 */
// The rest of this half was written in groups, one registry part per group, so authors never share a file.
export const AGY_STORIES: AnyProblemStory[] = [
  maximumDepthOfBinaryTreeStory,
  ...AGY_TREES1_STORIES,
  ...AGY_TREES2_STORIES,
  ...AGY_TREES3_STORIES,
  ...AGY_HEAP_STORIES,
  ...AGY_GRIDS_STORIES,
  ...AGY_GRAPHS1_STORIES,
  ...AGY_GRAPHS2_STORIES,
  ...AGY_CHOICES_STORIES,
  ...AGY_BOARDS_STORIES,
  ...AGY_DP1_STORIES,
  ...AGY_DP2_STORIES,
  ...AGY_DP3_STORIES,
  ...AGY_GROUPS_STORIES,
  ...AGY_DESIGN1_STORIES,
  ...AGY_DESIGN2_STORIES,
];

