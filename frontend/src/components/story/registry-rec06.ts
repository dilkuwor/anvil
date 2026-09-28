import type { AnyProblemStory } from "./types";
import { coinChangeIIStory } from "./stories/coin-change-ii";
import { combinationSumIVStory } from "./stories/combination-sum-iv";
import { minimumPathSumStory } from "./stories/minimum-path-sum";
import { stockCooldownStory } from "./stories/stock-cooldown";

/** Stories for the problems Grok's review recommended, batch 6. One file per author. */
export const REC06_STORIES: AnyProblemStory[] = [minimumPathSumStory, stockCooldownStory, coinChangeIIStory, combinationSumIVStory];
