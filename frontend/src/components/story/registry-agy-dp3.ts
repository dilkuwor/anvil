import { editDistanceStory } from "./stories/edit-distance";
import { maximalSquareStory } from "./stories/maximal-square";
import { palindromicSubstringsStory } from "./stories/palindromic-substrings";
import { uniquePathsStory } from "./stories/unique-paths";
import type { AnyProblemStory } from "./types";

/** One part of the second wave. Only the author of this group edits this file. */
export const AGY_DP3_STORIES: AnyProblemStory[] = [uniquePathsStory, maximalSquareStory, editDistanceStory, palindromicSubstringsStory];
