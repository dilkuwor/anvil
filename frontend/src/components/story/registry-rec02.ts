import { asteroidCollisionStory } from "./stories/asteroid-collision";
import { searchInsertPositionStory } from "./stories/search-insert-position";
import { singleElementSortedArrayStory } from "./stories/single-element-sorted-array";
import { validateStackSequencesStory } from "./stories/validate-stack-sequences";
import type { AnyProblemStory } from "./types";

/** Stories for the problems Grok's review recommended, batch 2. One file per author. */
export const REC02_STORIES: AnyProblemStory[] = [searchInsertPositionStory, singleElementSortedArrayStory, validateStackSequencesStory, asteroidCollisionStory];
