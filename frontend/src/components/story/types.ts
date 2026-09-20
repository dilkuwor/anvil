import type { ComponentType } from "react";

/**
 * A Visual Story teaches one specific problem, in the same five scenes every time.
 * The fixed shape is the point: it gives memory a stable frame to hang each problem on.
 *
 * Frames come from a pure function that really solves the problem on the chosen example,
 * so the pictures can never disagree with the algorithm.
 */

export type SceneId = "picture" | "slow" | "insight" | "solution" | "card";

export const SCENES: { id: SceneId; label: string; short: string }[] = [
  { id: "picture", label: "The problem", short: "Problem" },
  { id: "slow", label: "The slow way", short: "Slow" },
  { id: "insight", label: "Key insight", short: "Insight" },
  { id: "solution", label: "The solution", short: "Solution" },
  { id: "card", label: "Remember it", short: "Remember" },
];

type QuizBase = {
  question: string;
  /** Shown once the right answer is found. */
  why: string;
};

/**
 * "cell" quizzes are answered by clicking the picture itself. Pointing at the spot
 * is recall; picking a sentence from a list is only recognition.
 */
export type StoryQuiz =
  | (QuizBase & { kind: "choice"; options: string[]; answer: number })
  | (QuizBase & {
      kind: "cell";
      /** How many clickable cells the picture has. `answer` is always below it. */
      cells: number;
      answer: number;
      /** Why a specific wrong cell is wrong. Never has an entry for `answer`. */
      feedback: Record<number, string>;
      /** For any other wrong cell. A nudge, never the answer ("Click index 3" is forbidden). */
      otherwise: string;
      /** True only when the picture prints each cell's number, so the 0-9 keys mean something. */
      numbered?: boolean;
    });

/** Passed to the view while a "cell" quiz is open. */
export type CellPick = {
  onPick: (index: number) => void;
  picked: number | null;
  answer: number;
  /** Indices the reader tried that were not the answer, to visually eliminate them. */
  rejected?: number[];
};

export type StoryFrame<S> = {
  scene: SceneId;
  /** One or two short sentences. One new idea per frame. */
  caption: string;
  state: S;
  /** Index into `story.code`, for the solution scene. */
  codeLine?: number;
  /**
   * A prediction. This frame's picture and caption show the moment BEFORE the move;
   * the next frame is the reveal. Never ask about something already drawn or said.
   */
  quiz?: StoryQuiz;
};

export type StoryExample = {
  label: string;
  input: string;
  expected: string;
  note?: string;
};

export type ProblemStory<S> = {
  /** Every problem slug this story belongs to. */
  slugs: string[];
  pattern: string;
  /** Only the "when you see X" half. The card asks the reader to recall the rest, so never put the pattern here. */
  trigger: string;
  /** The one sentence to remember. */
  insight: string;
  /** Each cost comes with the reason you can see in the picture. */
  complexity: { slow: string; time: string; timeWhy: string; space: string; spaceWhy: string };
  code: string[];
  examples: StoryExample[];
  /** Fresh input for the "your turn" run. Different from every example, and it must reach the trap. */
  practiceInput: string;
  siblings: { slug: string; title: string }[];
  /** The mental picture every caption speaks in, mapped to the code's names. */
  metaphor: {
    name: string;
    legend: string;
    /** The metaphor's own words ("head", "tail"). Most solution captions must use one, so the story is told in the picture's language, not the code's. */
    terms: string[];
  };
  /** Named mistakes. A name is easier to recall than a condition. */
  traps: { name: string; rule: string }[];
  /** The reusable skeleton this problem is one instance of. */
  template: string[];
  /** Pure. Same input, same frames. */
  frames: (input: string) => StoryFrame<S>[];
  /** The answer the solution scene arrives at, for tests. */
  answer: (input: string) => string;
  View: ComponentType<{ state: S; pick?: CellPick }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyProblemStory = ProblemStory<any>;
