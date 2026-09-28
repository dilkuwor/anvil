import { candyStory } from "./stories/candy";
import { implementQueueUsingStacksStory } from "./stories/implement-queue-using-stacks";
import { lfuCacheStory } from "./stories/lfu-cache";
import { sumOfTwoIntegersStory } from "./stories/sum-of-two-integers";
import type { AnyProblemStory } from "./types";

/** Stories for the problems Grok's review recommended, batch 8. One file per author. */
export const REC08_STORIES: AnyProblemStory[] = [implementQueueUsingStacksStory, lfuCacheStory, candyStory, sumOfTwoIntegersStory];
