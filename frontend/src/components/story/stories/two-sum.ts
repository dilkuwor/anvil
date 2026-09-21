import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokCell, type GrokNotebookState, type GrokNote } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. 3+3 would reuse one seat; the real pair is 4 and 2. */
const PRACTICE = "[4,3,2]\n6";

const CODE = [
  "Map<Integer, Integer> seen = new HashMap<>();",
  "for (int i = 0; i < nums.length; i++) {",
  "    int need = target - nums[i];",
  "    if (seen.containsKey(need)) return new int[] {seen.get(need), i};",
  "    seen.put(nums[i], i);",
  "}",
  "return new int[0];",
];

function parse(raw: string): { nums: number[]; target: number } {
  const lines = raw.trim().split(/\n+/);
  const nums = (lines[0]?.match(/-?\d+/g) ?? []).map(Number);
  if (lines.length >= 2) return { nums, target: Number((lines[1].match(/-?\d+/) ?? ["0"])[0]) };
  return { nums: nums.slice(0, -1), target: nums[nums.length - 1] ?? 0 };
}

function tones(n: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: n }, (_, index) => paint(index) ?? "idle");
}

function cells(nums: number[], paint: (index: number) => CellTone | null, tags?: (string | undefined)[]): GrokCell[] {
  const t = tones(nums.length, paint);
  return nums.map((value, index) => ({
    value: String(value),
    tone: t[index],
    caption: String(index),
    tag: tags?.[index],
    tagTone: tags?.[index] ? "accent" : undefined,
  }));
}

function notes(seen: Map<number, number>, hot?: number | null): GrokNote[] {
  return [...seen.entries()].map(([key, seat]) => ({
    key: String(key),
    value: String(seat),
    tone: hot === key ? "hit" : "idle",
  }));
}

function picture(nums: number[], seen: Map<number, number>, paint: (index: number) => CellTone | null, extra?: Partial<GrokNotebookState>): GrokNotebookState {
  return {
    rows: [{ cells: cells(nums, paint) }],
    notebooks: [{ title: "notebook (value → seat)", entries: notes(seen, extra?.arc ? nums[extra.arc.col] : null) }],
    ...extra,
  };
}

function solve(nums: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const seat = seen.get(need);
    if (seat !== undefined) return [seat, i];
    seen.set(nums[i], i);
  }
  return null;
}

function fmt(pair: [number, number] | null): string {
  return pair ? `[${pair[0]},${pair[1]}]` : "[]";
}

function firstTrap(nums: number[], target: number): number | null {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (need === nums[i] && !seen.has(need)) return i;
    if (seen.has(need)) return null;
    seen.set(nums[i], i);
  }
  return null;
}

function pictureFrames(nums: number[], target: number, pair: [number, number] | null): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Each box is a number. We need two different seats whose values add to ${target}.`,
      state: picture(nums, new Map(), () => null),
    },
  ];
  if (pair) {
    frames.push({
      scene: "picture",
      caption: `Seats ${pair[0]} and ${pair[1]} hold ${nums[pair[0]]} and ${nums[pair[1]]}. They add to ${target}, so they are allowed.`,
      state: picture(nums, new Map(), (index) => (index === pair[0] || index === pair[1] ? "done" : "faded")),
    });
  }
  const trapAt = firstTrap(nums, target);
  if (trapAt !== null) {
    frames.push({
      scene: "picture",
      caption: `Using seat ${trapAt} twice is not allowed, even when ${nums[trapAt]} + ${nums[trapAt]} is ${target}.`,
      state: picture(nums, new Map(), (index) => (index === trapAt ? "miss" : "idle"), {
        ghost: { row: 0, col: trapAt, label: "✕ same seat" },
      }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: return the two seats, not the two values.",
    state: picture(nums, new Map(), (index) => (pair && (index === pair[0] || index === pair[1]) ? "done" : null)),
  });
  return frames;
}

function slowFrames(nums: number[], target: number): Frame[] {
  const frames: Frame[] = [];
  let checks = 0;
  let shown = 0;
  let found: [number, number] | null = null;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      checks += 1;
      const hit = nums[i] + nums[j] === target;
      if (hit) found = [i, j];
      if (shown < 3 || hit) {
        shown += 1;
        frames.push({
          scene: "slow",
          caption:
            shown === 1
              ? `The slow way: add every later box to this one. ${nums[i]} + ${nums[j]} ${hit ? "hits" : "misses"}.`
              : `Add ${nums[i]} + ${nums[j]} at seats ${i} and ${j}. ${hit ? "That is the pair." : "Not the target."}`,
          state: picture(nums, new Map(), (index) => (index === i || index === j ? (hit ? "done" : "window") : "faded"), {
            counter: { label: "pairs added", value: checks },
          }),
        });
      }
      if (hit) break;
    }
    if (found) break;
  }
  frames.push({
    scene: "slow",
    caption: `We added ${checks} pairs on a row of ${nums.length}. This is O(n²) time: every pair is tried.`,
    state: picture(nums, new Map(), () => "faded", { counter: { label: "pairs added", value: checks } }),
  });
  return frames;
}

function insightFrames(nums: number[], target: number): Frame[] {
  const trapAt = firstTrap(nums, target);
  const at = trapAt ?? 0;
  const need = target - nums[at];
  return [
    {
      scene: "insight",
      caption: `The partner of ${nums[at]} is ${need}: what you still need to reach ${target}.`,
      state: picture(nums, new Map(), (index) => (index === at ? "edge" : null), {
        counter: { label: "partner", value: need },
      }),
    },
    {
      scene: "insight",
      caption: "Write each value and its seat in a notebook. Later boxes can look the partner up in one glance.",
      state: picture(nums, new Map([[nums[0], 0]]), (index) => (index === 0 ? "hit" : null), {
        arc: { row: 0, col: 0, notebook: 0, entry: 0, tone: "hit" },
      }),
    },
    {
      scene: "insight",
      caption:
        trapAt !== null
          ? `Look up first, then write. Writing first is the Same-Index Trap: ${nums[at]} would pair with its own seat.`
          : "Look up first, then write. That is how we dodge the Same-Index Trap: one seat, one use.",
      state: picture(nums, new Map(), (index) => (index === at ? "miss" : null), {
        ghost: { row: 0, col: at, label: "✕ same seat" },
        banner: { text: "Same-Index Trap", tone: "coral" },
      }),
    },
  ];
}

function partnerQuiz(cells: number, partner: number, here: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  feedback[here] = "That is the Same-Index Trap. This box is the one we are reading now.";
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "The notebook has the partner. Which box is that earlier seat? Click it.",
    answer: partner,
    feedback,
    otherwise: "Pick the earlier box whose value is the partner we just looked up.",
    why: "The notebook stores value to seat. The partner's seat is the one we wrote earlier.",
  };
}

function solutionFrames(nums: number[], target: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const seen = new Map<number, number>();
  const line = (index: number) => (practice ? undefined : index);
  let askedTrap = false;
  let askedHit = false;
  const pair = solve(nums, target);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}], target ${target}. You decide when to write in the notebook.`
      : "The notebook starts empty. We will walk the row once.",
    codeLine: line(0),
    state: picture(nums, new Map(), () => null),
  });

  for (let i = 0; i < nums.length; i++) {
    const value = nums[i];
    const need = target - value;
    const hit = seen.get(need);
    const trapHere = need === value && hit === undefined;

    if (!practice) {
      frames.push({
        scene,
        caption: `Read ${value}. Its partner is ${need}. Ask the notebook for that partner first.`,
        codeLine: line(2),
        state: picture(nums, new Map(seen), (index) => (index === i ? "edge" : index < i ? "faded" : null), {
          counter: { label: "partner", value: need },
        }),
      });
    }

    if (trapHere && (practice || !askedTrap)) {
      askedTrap = true;
      frames.push({
        scene,
        caption: practice
          ? `${value} plus ${value} is the target. Can this one box fill both seats?`
          : `${value} plus ${value} is the target. The notebook does not have a partner yet.`,
        codeLine: line(3),
        state: picture(nums, new Map(seen), (index) => (index === i ? "miss" : index < i ? "faded" : null), {
          ghost: { row: 0, col: i, label: "✕ same seat" },
          banner: { text: "Same-Index Trap", tone: "coral" },
          counter: { label: "partner", value: need },
        }),
        quiz: {
          kind: "choice",
          question: "This box equals its own partner. What do we do?",
          options: ["Pair it with itself and stop", "Leave it, write it in the notebook, keep walking"],
          answer: 1,
          why: "Look up first. The same seat cannot be used twice. Write it, then keep walking.",
        },
      });
      frames.push({
        scene,
        caption: `The Same-Index Trap: one seat cannot pair with itself. We write ${value} at seat ${i} and keep walking.`,
        codeLine: line(4),
        state: picture(nums, new Map([...seen.entries(), [value, i]]), (index) => (index === i ? "window" : index < i ? "faded" : null), {
          arc: { row: 0, col: i, notebook: 0, entry: [...seen.keys(), value].indexOf(value), tone: "hit" },
        }),
      });
    } else if (hit !== undefined) {
      const reveal: Frame = {
        scene,
        caption: `The notebook has the partner ${need}. Which earlier seat is it?`,
        codeLine: line(3),
        state: picture(nums, new Map(seen), (index) => (index === i ? "edge" : index < i ? "window" : null), {
          counter: { label: "partner", value: need },
        }),
      };
      if (practice || !askedHit) {
        askedHit = true;
        reveal.quiz = partnerQuiz(nums.length, hit, i);
      }
      frames.push(reveal);
      frames.push({
        scene,
        caption: `Seat ${hit} holds the partner. The two seats are ${hit} and ${i}. The answer is ${fmt(pair)}.`,
        codeLine: line(3),
        state: picture(nums, new Map(seen), (index) => (index === i || index === hit ? "done" : "faded"), {
          arc: { row: 0, col: i, notebook: 0, entry: [...seen.keys()].indexOf(need), tone: "hit" },
        }),
      });
      break;
    } else {
      seen.set(value, i);
      frames.push({
        scene,
        caption: `No partner yet. Write ${value} at seat ${i} in the notebook.`,
        codeLine: line(4),
        state: picture(nums, new Map(seen), (index) => (index === i ? "window" : index < i ? "faded" : null), {
          arc: { row: 0, col: i, notebook: 0, entry: [...seen.keys()].indexOf(value), tone: "hit" },
        }),
      });
    }

    if (hit === undefined && !trapHere) {
      // already stored above
    } else if (hit === undefined && trapHere) {
      seen.set(value, i);
    }
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each box is read once, and each notebook look-up is constant work.`,
      codeLine: 1,
      state: picture(nums, new Map(), (index) => (pair && (index === pair[0] || index === pair[1]) ? "done" : "faded"), {
        counter: { label: "boxes read", value: nums.length },
      }),
    });
    frames.push({
      scene,
      caption: `Space: O(n). The notebook holds one page per earlier value.`,
      codeLine: 0,
      state: picture(
        nums,
        pair ? new Map([[nums[pair[0]], pair[0]]]) : new Map(),
        (index) => (pair && (index === pair[0] || index === pair[1]) ? "done" : "faded"),
      ),
    });
  } else if (pair) {
    frames.push({
      scene,
      caption: `Done. The answer is ${fmt(pair)}. You chose when to write in the notebook.`,
      state: picture(nums, new Map(), (index) => (index === pair[0] || index === pair[1] ? "done" : "faded")),
    });
  }
  return frames;
}

export const twoSumStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-1"],
  pattern: "Hash map",
  trigger: "two indices whose values add to a target, and exactly one pair exists",
  insight: "A notebook of value to seat. Look up the partner first, then write this box, so one seat is never used twice.",
  metaphor: {
    name: "The notebook",
    legend: "notebook = seen map · partner = target − value · seat = index",
    terms: ["notebook", "partner", "seat"],
  },
  traps: [
    {
      name: "The Same-Index Trap",
      rule: "Look up the partner before you write this box. A value cannot pair with its own seat.",
    },
  ],
  template: [
    "seen = empty notebook of value → seat;",
    "for each box i {",
    "    look up target - value;",
    "    if found, return those two seats;",
    "    else write value → i;",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each box is stored once and looked up once",
    space: "O(n)",
    spaceWhy: "the notebook holds earlier values",
  },
  code: CODE,
  examples: [
    { label: "[2,7,11,15] target 9", input: "[2,7,11,15]\n9", expected: "[0,1]" },
    { label: "[3,2,4] target 6", input: "[3,2,4]\n6", expected: "[1,2]", note: "3+3 would reuse seat 0" },
    { label: "[3,3] target 6", input: "[3,3]\n6", expected: "[0,1]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-167", title: "Two Sum II - Input Array Is Sorted" },
    { slug: "lc-15", title: "3Sum" },
    { slug: "pair-target", title: "Pair Target" },
  ],
  answer: (input) => {
    const { nums, target } = parse(input);
    return fmt(solve(nums, target));
  },
  frames: (input) => {
    const { nums, target } = parse(input);
    const pair = solve(nums, target);
    return [
      ...pictureFrames(nums, target, pair),
      ...slowFrames(nums, target),
      ...insightFrames(nums, target),
      ...solutionFrames(nums, target),
      ...solutionFrames(parse(PRACTICE).nums, parse(PRACTICE).target, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, pair ? new Map([[nums[pair[0]], pair[0]]]) : new Map(), (index) =>
          pair && (index === pair[0] || index === pair[1]) ? "done" : null,
        ),
      },
    ];
  },
  View: GrokNotebookView,
};
