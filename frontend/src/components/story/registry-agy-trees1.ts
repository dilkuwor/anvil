import { balancedBinaryTreeStory } from "./stories/balanced-binary-tree";
import { diameterOfBinaryTreeStory } from "./stories/diameter-of-binary-tree";
import { invertBinaryTreeStory } from "./stories/invert-binary-tree";
import { pathSumStory } from "./stories/path-sum";
import { sameTreeStory } from "./stories/same-tree";
import { subtreeOfAnotherTreeStory } from "./stories/subtree-of-another-tree";
import { symmetricTreeStory } from "./stories/symmetric-tree";
import type { AnyProblemStory } from "./types";

/** One part of the second wave. Only the author of this group edits this file. */
export const AGY_TREES1_STORIES: AnyProblemStory[] = [
  sameTreeStory,
  symmetricTreeStory,
  subtreeOfAnotherTreeStory,
  balancedBinaryTreeStory,
  diameterOfBinaryTreeStory,
  pathSumStory,
  invertBinaryTreeStory,
];

