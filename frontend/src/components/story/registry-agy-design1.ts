import { designHashMapStory } from "./stories/design-hashmap";
import { designHitCounterStory } from "./stories/design-hit-counter";
import { encodeAndDecodeTinyurlStory } from "./stories/encode-and-decode-tinyurl";
import { insertDeleteGetrandomStory } from "./stories/insert-delete-getrandom";
import type { AnyProblemStory } from "./types";

/** One part of the second wave. Only the author of this group edits this file. */
export const AGY_DESIGN1_STORIES: AnyProblemStory[] = [
  designHashMapStory,
  insertDeleteGetrandomStory,
  designHitCounterStory,
  encodeAndDecodeTinyurlStory,
];
