import type { AnyProblemStory } from "./types";

// Microsoft batch. Each story replaces its own slot line below; never touch another slot.
import { rotateListStory } from "./stories/rotate-list";
import { deleteNodeBstStory } from "./stories/delete-node-bst";
import { gameOfLifeStory } from "./stories/game-of-life";
import { ticTacToeStory } from "./stories/tic-tac-toe";

export const MS_STORIES: AnyProblemStory[] = [
  rotateListStory,
  deleteNodeBstStory,
  gameOfLifeStory,
  ticTacToeStory,
];
