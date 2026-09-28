import { isGraphBipartiteStory } from "./stories/is-graph-bipartite";
import { minCostConnectPointsStory } from "./stories/min-cost-connect-points";
import { pathWithMinimumEffortStory } from "./stories/path-with-minimum-effort";
import { searchMatrixIIStory } from "./stories/search-2d-matrix-ii";
import type { AnyProblemStory } from "./types";

/** Stories for the problems Grok's review recommended, batch 7. One file per author. */
export const REC07_STORIES: AnyProblemStory[] = [isGraphBipartiteStory, minCostConnectPointsStory, pathWithMinimumEffortStory, searchMatrixIIStory];
