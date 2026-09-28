import type { AnyProblemStory } from "./types";
import { maximumAverageSubarrayStory } from "./stories/maximum-average-subarray";
import { rangeSumQueryStory } from "./stories/range-sum-query";
import { sortColorsStory } from "./stories/sort-colors";
import { squaresOfSortedArrayStory } from "./stories/squares-of-sorted-array";

/** Stories for the problems Grok's review recommended, batch 1. One file per author. */
export const REC01_STORIES: AnyProblemStory[] = [maximumAverageSubarrayStory, squaresOfSortedArrayStory, sortColorsStory, rangeSumQueryStory];
