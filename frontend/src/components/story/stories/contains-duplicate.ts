import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokCell, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. The copy is not a neighbour, so sorting would scramble the original seats. */
const PRACTICE = "[2,5,2]";

const CODE = [
  "Set<Integer> seen = new HashSet<>();",
  "for (int value : nums) {",
  "    if (!seen.add(value)) return true;",
  "}",
  "return false;",
];

function parse(raw: string): number[] {
  return (raw.match(/-?\d+/g) ?? []).map(Number);
}

function cells(nums: number[], paint: (index: number) => CellTone | null): GrokCell[] {
  return nums.map((value, index) => ({
    value: String(value),
    tone: paint(index) ?? "idle",
    caption: String(index),
  }));
}

function picture(nums: number[], seen: Iterable<number>, paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  const pages = [...seen];
  return {
    rows: [{ cells: cells(nums, paint) }],
    notebooks: [{ title: "notebook (seen values)", entries: pages.map((key) => ({ key: String(key), value: "yes", tone: "idle" })) }],
    ...extra,
  };
}

function solve(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const value of nums) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

function firstCopy(nums: number[]): { here: number; earlier: number } | null {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const earlier = seen.get(nums[i]);
    if (earlier !== undefined) return { here: i, earlier };
    seen.set(nums[i], i);
  }
  return null;
}

function pictureFrames(nums: number[]): Frame[] {
  const copy = firstCopy(nums);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "Each box is a number. We ask: does any value appear at least twice?",
      state: picture(nums, [], () => null),
    },
  ];
  if (copy) {
    frames.push({
      scene: "picture",
      caption: `${nums[copy.earlier]} sits at seat ${copy.earlier} and again at seat ${copy.here}. That is a copy, so the answer is true.`,
      state: picture(nums, [], (index) => (index === copy.here || index === copy.earlier ? "miss" : "faded")),
    });
  } else {
    frames.push({
      scene: "picture",
      caption: "No value repeats. Every box is unique, so the answer is false.",
      state: picture(nums, [], () => "done"),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: true if a copy exists, false if every value is unique.",
    state: picture(nums, [], (index) => (copy && (index === copy.here || index === copy.earlier) ? "miss" : null)),
  });
  return frames;
}

function slowFrames(nums: number[]): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let shown = 0;
  let found = false;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      checks += 1;
      const hit = nums[i] === nums[j];
      if (shown < 3 || hit) {
        shown += 1;
        frames.push({
          scene: "slow",
          caption:
            shown === 1
              ? `The slow way: compare this box with every later box. ${nums[i]} and ${nums[j]} ${hit ? "match" : "differ"}.`
              : `Compare ${nums[i]} with ${nums[j]}. ${hit ? "A copy." : "Not a copy."}`,
          state: picture(nums, [], (index) => (index === i || index === j ? (hit ? "miss" : "window") : "faded"), {
            counter: { label: "pairs compared", value: checks },
          }),
        });
      }
      if (hit) {
        found = true;
        break;
      }
    }
    if (found) break;
  }
  frames.push({
    scene: "slow",
    caption: `We compared ${checks} pairs on a row of ${nums.length}. This is O(n²) time.`,
    state: picture(nums, [], () => "faded", { counter: { label: "pairs compared", value: checks } }),
  });
  return frames;
}

function insightFrames(nums: number[]): Frame[] {
  const copy = firstCopy(nums);
  const sorted = [...nums].sort((a, b) => a - b);
  return [
    {
      scene: "insight",
      caption: "Write each value in a notebook as you walk. If a write finds the page already there, you have a copy.",
      state: picture(nums, nums.slice(0, 1), (index) => (index === 0 ? "hit" : null), {
        arc: { row: 0, col: 0, notebook: 0, entry: 0, tone: "hit" },
      }),
    },
    {
      scene: "insight",
      caption: "Sorting the original row would also clump copies, but it scrambles the seats the caller still owns.",
      state: {
        rows: [{ cells: sorted.map((value, index) => ({ value: String(value), tone: "miss", caption: String(index) })) }],
        notebooks: [{ title: "notebook (seen values)", entries: [] }],
        banner: { text: "Scramble Trap", tone: "coral" },
      },
    },
    {
      scene: "insight",
      caption:
        copy
          ? `The Scramble Trap: sorting the caller's row mixes the seats. The notebook leaves every seat where it was, and still finds the copy of ${nums[copy.here]}.`
          : "The Scramble Trap: sorting the caller's row mixes the seats. The notebook leaves every seat where it was.",
      state: picture(nums, [], copy ? (index) => (index === copy.here || index === copy.earlier ? "hit" : null) : () => null),
    },
  ];
}

function copyQuiz(cells: number, earlier: number, here: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  feedback[here] = "This is the box we just read. The copy we already wrote sits earlier.";
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "This value is already in the notebook. Which earlier box did we write it from? Click that box.",
    answer: earlier,
    feedback,
    otherwise: "The notebook already holds this value. Point at the earlier box that put it there.",
    why: "A failed write means we have seen this value before, in an earlier seat.",
  };
}

function solutionFrames(nums: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const seen = new Set<number>();
  const seats = new Map<number, number>();
  const line = (index: number) => (practice ? undefined : index);
  let askedWrite = false;
  let askedCopy = false;
  const answer = solve(nums);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}]. You decide whether each value is new.`
      : "The notebook starts empty. We write as we walk.",
    codeLine: line(0),
    state: picture(nums, [], () => null),
  });

  for (let i = 0; i < nums.length; i++) {
    const value = nums[i];
    const earlier = seats.get(value);
    if (!practice) {
      frames.push({
        scene,
        caption: `Read ${value}. Ask the notebook: is this value already on a page?`,
        codeLine: line(1),
        state: picture(nums, seen, (index) => (index === i ? "edge" : index < i ? "faded" : null)),
      });
    }

    if (earlier !== undefined) {
      const quizFrame: Frame = {
        scene,
        caption: `${value} is already in the notebook.`,
        codeLine: line(2),
        state: picture(nums, seen, (index) => (index === i ? "edge" : index < i ? "window" : null), {
          banner: { text: "copy found", tone: "coral" },
        }),
      };
      if (practice || !askedCopy) {
        askedCopy = true;
        quizFrame.quiz = copyQuiz(nums.length, earlier, i);
      }
      frames.push(quizFrame);
      frames.push({
        scene,
        caption: `The write fails. Seat ${earlier} already held ${value}. The answer is ${answer}.`,
        codeLine: line(2),
        state: picture(nums, seen, (index) => (index === i || index === earlier ? "miss" : "faded"), {
          arc: { row: 0, col: i, notebook: 0, entry: [...seen].indexOf(value), tone: "miss" },
        }),
      });
      break;
    }

    const writeFrame: Frame = {
      scene,
      caption: `The notebook does not have ${value} yet.`,
      codeLine: line(2),
      state: picture(nums, seen, (index) => (index === i ? "edge" : index < i ? "faded" : null)),
    };
    if (practice && !askedWrite) {
      askedWrite = true;
      writeFrame.quiz = {
        kind: "choice",
        question: "This value is new. What does the notebook do?",
        options: ["Stop and return true", "Write it, then keep walking"],
        answer: 1,
        why: "A new value is written. Only a failed write means a copy.",
      };
    }
    frames.push(writeFrame);
    seen.add(value);
    seats.set(value, i);
    frames.push({
      scene,
      caption: `Write ${value} in the notebook and keep walking.`,
      codeLine: line(2),
      state: picture(nums, seen, (index) => (index === i ? "hit" : index < i ? "faded" : null), {
        arc: { row: 0, col: i, notebook: 0, entry: [...seen].indexOf(value), tone: "hit" },
      }),
    });
  }

  if (!answer) {
    frames.push({
      scene,
      caption: `Every write succeeded. The answer is false.`,
      codeLine: line(4),
      state: picture(nums, seen, () => "done"),
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each box is written at most once.`,
      codeLine: 1,
      state: picture(nums, seen, () => "faded", { counter: { label: "boxes read", value: nums.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(n). The notebook holds the unique values seen so far.`,
      codeLine: 0,
      state: picture(nums, seen, () => "faded"),
    });
  } else {
    frames.push({
      scene,
      caption: `Done. The answer is ${answer}. You decided every write.`,
      state: picture(nums, seen, (index) => {
        const copy = firstCopy(nums);
        return copy && (index === copy.here || index === copy.earlier) ? "miss" : "faded";
      }),
    });
  }
  return frames;
}

export const containsDuplicateStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-217"],
  pattern: "Hash set",
  trigger: "return true if any value appears at least twice",
  insight: "A notebook of values already seen. A failed write means a copy. Leave the original row alone.",
  metaphor: {
    name: "The notebook",
    legend: "notebook = seen set · write = add · copy = add returns false",
    terms: ["notebook", "write", "copy"],
  },
  traps: [
    {
      name: "The Scramble Trap",
      rule: "Do not sort the caller's row. Use a notebook, or sort a copy if you must.",
    },
  ],
  template: [
    "seen = empty notebook;",
    "for each value {",
    "    if write fails, return true;",
    "}",
    "return false;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each value is written at most once",
    space: "O(n)",
    spaceWhy: "the notebook holds the distinct values seen so far",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,1]", input: "[1,2,3,1]", expected: "true" },
    { label: "[1,2,3,4]", input: "[1,2,3,4]", expected: "false" },
    { label: "[1,1]", input: "[1,1]", expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-26", title: "Remove Duplicates from Sorted Array" },
    { slug: "lc-136", title: "Single Number" },
    { slug: "lc-169", title: "Majority Element" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const nums = parse(input);
    return [
      ...pictureFrames(nums),
      ...slowFrames(nums),
      ...insightFrames(nums),
      ...solutionFrames(nums),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, new Set(nums.slice(0, 2)), () => null),
      },
    ];
  },
  View: GrokNotebookView,
};
