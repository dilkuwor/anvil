import { combinationSumStory } from "./stories/combination-sum";
import { generateParenthesesStory } from "./stories/generate-parentheses";
import { letterCombinationsStory } from "./stories/letter-combinations";
import { palindromePartitioningStory } from "./stories/palindrome-partitioning";
import { permutationsStory } from "./stories/permutations";
import { subsetsStory } from "./stories/subsets";
import { subsetsIiStory } from "./stories/subsets-ii";
import type { AnyProblemStory } from "./types";

/** One part of the second wave. Only the author of this group edits this file. */
export const AGY_CHOICES_STORIES: AnyProblemStory[] = [
  subsetsStory,
  subsetsIiStory,
  permutationsStory,
  combinationSumStory,
  letterCombinationsStory,
  generateParenthesesStory,
  palindromePartitioningStory,
];

