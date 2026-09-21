import { accountsMergeStory } from "./stories/accounts-merge";
import { designAddSearchWordsStory } from "./stories/add-and-search-words";
import { implementTrieStory } from "./stories/implement-trie";
import { numberOfConnectedComponentsStory } from "./stories/number-of-connected-components";
import { redundantConnectionStory } from "./stories/redundant-connection";
import { wordSearchIIStory } from "./stories/word-search-ii";
import type { AnyProblemStory } from "./types";

/** One part of the second wave. Only the author of this group edits this file. */
export const AGY_GROUPS_STORIES: AnyProblemStory[] = [
  implementTrieStory,
  designAddSearchWordsStory,
  wordSearchIIStory,
  numberOfConnectedComponentsStory,
  redundantConnectionStory,
  accountsMergeStory,
];
