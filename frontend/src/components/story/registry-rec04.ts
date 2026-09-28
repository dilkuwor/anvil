import { happyNumberStory } from "./stories/happy-number";
import { linkedListCycleIIStory } from "./stories/linked-list-cycle-ii";
import { middleOfLinkedListStory } from "./stories/middle-of-linked-list";
import { reverseLinkedListIIStory } from "./stories/reverse-linked-list-ii";
import type { AnyProblemStory } from "./types";

/** Stories for the problems Grok's review recommended, batch 4. One file per author. */
export const REC04_STORIES: AnyProblemStory[] = [middleOfLinkedListStory, reverseLinkedListIIStory, linkedListCycleIIStory, happyNumberStory];
