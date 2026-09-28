import type { AnyProblemStory } from "./types";
import { carFleetStory } from "./stories/car-fleet";
import { intervalListIntersectionsStory } from "./stories/interval-list-intersections";
import { kthLargestInStreamStory } from "./stories/kth-largest-in-stream";
import { meetingRoomsStory } from "./stories/meeting-rooms";

/** Stories for the problems Grok's review recommended, batch 3. One file per author. */
export const REC03_STORIES: AnyProblemStory[] = [meetingRoomsStory, intervalListIntersectionsStory, carFleetStory, kthLargestInStreamStory];
