import { cloneGraphStory } from "./stories/clone-graph";
import { matrix01Story } from "./stories/01-matrix";
import { numberOfProvincesStory } from "./stories/number-of-provinces";
import { pacificAtlanticWaterFlowStory } from "./stories/pacific-atlantic-water-flow";
import { surroundedRegionsStory } from "./stories/surrounded-regions";
import { wallsAndGatesStory } from "./stories/walls-and-gates";
import type { AnyProblemStory } from "./types";

/** One part of the second wave. Only the author of this group edits this file. */
export const AGY_GRAPHS1_STORIES: AnyProblemStory[] = [
  surroundedRegionsStory,
  wallsAndGatesStory,
  pacificAtlanticWaterFlowStory,
  matrix01Story,
  numberOfProvincesStory,
  cloneGraphStory,
];
