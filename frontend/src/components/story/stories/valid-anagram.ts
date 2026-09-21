import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokCell, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh pair. Different lengths: skipping that check would wrongly tally only the shorter row. */
const PRACTICE = '"aa"\n"a"';

const CODE = [
  "if (s.length() != t.length()) return false;",
  "int[] counts = new int[26];",
  "for (int i = 0; i < s.length(); i++) {",
  "    counts[s.charAt(i) - 'a']++;",
  "    counts[t.charAt(i) - 'a']--;",
  "}",
  "for (int count : counts) {",
  "    if (count != 0) return false;",
  "}",
  "return true;",
];

function parse(raw: string): { s: string; t: string } {
  const quoted = [...raw.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quoted.length >= 2) return { s: quoted[0], t: quoted[1] };
  const lines = raw.trim().split(/\n/);
  return { s: (lines[0] ?? "").replace(/"/g, ""), t: (lines[1] ?? "").replace(/"/g, "") };
}

function letters(word: string, paint: (index: number) => CellTone | null): GrokCell[] {
  return [...word].map((ch, index) => ({
    value: ch,
    tone: paint(index) ?? "idle",
    caption: String(index),
  }));
}

function tally(word: string): { key: string; value: string }[] {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts.entries()].map(([key, value]) => ({ key, value: String(value) }));
}

function picture(
  s: string,
  t: string,
  extra?: Partial<GrokNotebookState> & { sPaint?: (i: number) => CellTone | null; tPaint?: (i: number) => CellTone | null },
): GrokNotebookState {
  const { sPaint, tPaint, ...rest } = extra ?? {};
  return {
    rows: [
      { label: "s", cells: letters(s, sPaint ?? (() => null)) },
      { label: "t", cells: letters(t, tPaint ?? (() => null)) },
    ],
    notebooks: [
      { title: "tally s", entries: tally(s) },
      { title: "tally t", entries: tally(t) },
    ],
    ...rest,
  };
}

function solve(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length; i++) {
    counts.set(s[i], (counts.get(s[i]) ?? 0) + 1);
    counts.set(t[i], (counts.get(t[i]) ?? 0) - 1);
  }
  return [...counts.values()].every((n) => n === 0);
}

function pictureFrames(s: string, t: string, ok: boolean): Frame[] {
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `Two rows of letters. We ask: is t a rearrangement of s?`,
      state: picture(s, t),
    },
  ];
  if (s.length !== t.length) {
    frames.push({
      scene: "picture",
      caption: `The rows have different lengths (${s.length} and ${t.length}), so they cannot match.`,
      state: picture(s, t, {
        sPaint: () => "miss",
        tPaint: () => "miss",
        banner: { text: "different lengths", tone: "coral" },
      }),
    });
  } else {
    frames.push({
      scene: "picture",
      caption: ok
        ? `Same letters, same counts. "${t}" is a rearrangement of "${s}", so it is allowed.`
        : `Same length, but the letter counts differ, so they do not match.`,
      state: picture(s, t, { sPaint: () => (ok ? "done" : "miss"), tPaint: () => (ok ? "done" : "miss") }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: true if the two tallies match, false otherwise.",
    state: picture(s, t, { sPaint: () => (ok ? "done" : null), tPaint: () => (ok ? "done" : null) }),
  });
  return frames;
}

function slowFrames(s: string, t: string): Frame[] {
  const frames: Frame[] = [];
  const a = [...s].sort();
  const b = [...t].sort();
  frames.push({
    scene: "slow",
    caption: `The slow way: sort both rows and compare. s becomes ${a.join("")}.`,
    state: {
      rows: [
        { label: "s sorted", cells: a.map((ch, index) => ({ value: ch, tone: "window", caption: String(index) })) },
        { label: "t", cells: letters(t, () => "faded") },
      ],
      notebooks: [
        { title: "tally s", entries: [] },
        { title: "tally t", entries: [] },
      ],
      counter: { label: "sorts", value: 1 },
    },
  });
  frames.push({
    scene: "slow",
    caption: `t becomes ${b.join("")}. ${a.join("") === b.join("") ? "They match." : "They differ."} Sorting both is O(n log n).`,
    state: {
      rows: [
        { label: "s sorted", cells: a.map((ch, index) => ({ value: ch, tone: "window", caption: String(index) })) },
        { label: "t sorted", cells: b.map((ch, index) => ({ value: ch, tone: "window", caption: String(index) })) },
      ],
      notebooks: [
        { title: "tally s", entries: tally(s) },
        { title: "tally t", entries: tally(t) },
      ],
      counter: { label: "sorts", value: 2 },
    },
  });
  return frames;
}

function insightFrames(s: string, t: string): Frame[] {
  const longer = s.length <= t.length ? "t" : "s";
  return [
    {
      scene: "insight",
      caption: "Two tallies, one for each row. Count s up and t down. Matching words end at zero on every letter.",
      state: picture(s, t),
    },
    {
      scene: "insight",
      caption:
        s.length === t.length
          ? "If the rows were different lengths they could never match. Check that first."
          : `These rows have different lengths. The Length-Skip Trap is tallying anyway, walking only the shorter row.`,
      state: picture(s, t, {
        banner: { text: "Length-Skip Trap", tone: "coral" },
        sPaint: () => (s.length === t.length ? "window" : "miss"),
        tPaint: () => (s.length === t.length ? "window" : "miss"),
      }),
    },
    {
      scene: "insight",
      caption: `The Length-Skip Trap: skipping the length check can ignore extra letters on ${longer} and call a miss a match.`,
      state: picture(s, t, { ghost: { row: s.length <= t.length ? 1 : 0, col: Math.min(s.length, t.length) === 0 ? 0 : Math.min(s.length, t.length) - (s.length === t.length ? 1 : 0), label: "✕ extra" } }),
    },
  ];
}

function solutionFrames(s: string, t: string, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const ok = solve(s, t);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new pair: "${s}" and "${t}". First, are the two rows the same length?`
      : "First, compare the two row lengths. Only then fill the tallies.",
    codeLine: line(0),
    state: picture(s, t),
    quiz: {
      kind: "choice",
      question: "Are the two rows the same length?",
      options: ["Yes, tally them", "No, they cannot be a match"],
      answer: s.length === t.length ? 0 : 1,
      why: s.length === t.length ? "Same length, so the tallies can be compared letter by letter." : "Different lengths cannot be a rearrangement. Return false now.",
    },
  });

  if (s.length !== t.length) {
    const longRow = s.length > t.length ? 0 : 1;
    const extraCol = Math.min(s.length, t.length);
    const extraIndex = longRow === 0 ? extraCol : s.length + extraCol;
    const peek: Frame = {
      scene,
      caption: `The rows differ in length. The Length-Skip Trap would walk only the shorter row and miss an extra letter.`,
      codeLine: line(0),
      state: picture(s, t, {
        sPaint: (index) => (longRow === 0 && index === extraCol ? "miss" : "window"),
        tPaint: (index) => (longRow === 1 && index === extraCol ? "miss" : "window"),
        banner: { text: "Length-Skip Trap", tone: "coral" },
      }),
    };
    if (practice) {
      peek.quiz = {
        kind: "cell",
        cells: s.length + t.length,
        numbered: true,
        question: "If we skipped the length check, which extra letter would we ignore? Click that box.",
        answer: extraIndex,
        feedback: {},
        otherwise: "The extra letter sits past the shorter row. Point at the first leftover box.",
        why: "Different lengths cannot match. The leftover letter is why we stop now.",
      };
    }
    frames.push(peek);
    frames.push({
      scene,
      caption: `We stop. The two rows cannot match. The answer is false.`,
      codeLine: line(0),
      state: picture(s, t, {
        sPaint: () => "miss",
        tPaint: () => "miss",
        banner: { text: "Length-Skip Trap", tone: "coral" },
      }),
    });
  } else {
    const counts = new Map<string, number>();
    for (let i = 0; i < s.length; i++) {
      counts.set(s[i], (counts.get(s[i]) ?? 0) + 1);
      counts.set(t[i], (counts.get(t[i]) ?? 0) - 1);
      if (!practice || i === 0) {
        const step: Frame = {
          scene,
          caption: `Count ${s[i]} up on the s tally and ${t[i]} down on the t tally.`,
          codeLine: line(3),
          state: picture(s.slice(0, i + 1) + s.slice(i + 1), t, {
            sPaint: (index) => (index === i ? "edge" : index < i ? "window" : null),
            tPaint: (index) => (index === i ? "edge" : index < i ? "window" : null),
          }),
        };
        // rebuild picture with partial tallies
        step.state = {
          rows: [
            { label: "s", cells: letters(s, (index) => (index === i ? "edge" : index < i ? "window" : null)) },
            { label: "t", cells: letters(t, (index) => (index === i ? "edge" : index < i ? "window" : null)) },
          ],
          notebooks: [
            { title: "tally s", entries: tally(s.slice(0, i + 1)) },
            { title: "tally t", entries: tally(t.slice(0, i + 1)) },
          ],
        };
        if (practice && i === 0) {
          step.quiz = {
            kind: "choice",
            question: "The lengths match. How do we tally this pair of letters?",
            options: ["Count s up and t down", "Skip the rest of the letters"],
            answer: 0,
            why: "Walk both rows together. s adds one, t subtracts one.",
          };
        }
        frames.push(step);
      }
    }
    const matched = [...counts.values()].every((n) => n === 0);
    frames.push({
      scene,
      caption: matched ? `Every tally slot is zero. The two rows match. The answer is true.` : `A tally slot is not zero. The rows do not match. The answer is false.`,
      codeLine: line(matched ? 9 : 7),
      state: picture(s, t, { sPaint: () => (matched ? "done" : "miss"), tPaint: () => (matched ? "done" : "miss") }),
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each letter is read once, then 26 slots are checked.`,
      codeLine: 2,
      state: picture(s, t, { counter: { label: "letters read", value: Math.min(s.length, t.length) } }),
    });
    frames.push({
      scene,
      caption: `Space: O(1). The tally has a fixed 26 slots.`,
      codeLine: 1,
      state: picture(s, t),
    });
  } else {
    frames.push({
      scene,
      caption: `Done. The answer is ${ok}. You checked the lengths first.`,
      state: picture(s, t, { sPaint: () => (ok ? "done" : "miss"), tPaint: () => (ok ? "done" : "miss") }),
    });
  }
  return frames;
}

export const validAnagramStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-242"],
  pattern: "Frequency count",
  trigger: "return true if one string is an anagram of the other",
  insight: "If the lengths differ, stop. Then two tallies: count one row up and the other down. All slots must end at zero.",
  metaphor: {
    name: "Two tallies",
    legend: "tally = count array · slot = one letter · row = s or t",
    terms: ["tally", "slot", "row"],
  },
  traps: [
    {
      name: "The Length-Skip Trap",
      rule: "Different lengths cannot match. Return false first, so the two rows stay in lockstep.",
    },
  ],
  template: [
    "if lengths differ, return false;",
    "for each letter, count s up and t down;",
    "if every slot is 0, return true;",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "each letter of s and t is read once, then 26 slots are checked",
    space: "O(1)",
    spaceWhy: "the tally has a fixed 26 slots",
  },
  code: CODE,
  examples: [
    { label: '"ab" / "ba"', input: '"ab"\n"ba"', expected: "true" },
    { label: '"rat" / "car"', input: '"rat"\n"car"', expected: "false" },
    { label: '"a" / "ab"', input: '"a"\n"ab"', expected: "false", note: "different lengths" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-49", title: "Group Anagrams" },
    { slug: "lc-438", title: "Find All Anagrams in a String" },
    { slug: "anagram-bundles", title: "Anagram Bundles" },
  ],
  answer: (input) => {
    const { s, t } = parse(input);
    return String(solve(s, t));
  },
  frames: (input) => {
    const { s, t } = parse(input);
    const ok = solve(s, t);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(s, t, ok),
      ...slowFrames(s, t),
      ...insightFrames(s, t),
      ...solutionFrames(s, t),
      ...solutionFrames(practice.s, practice.t, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(s, t, { sPaint: () => (ok ? "done" : "miss"), tPaint: () => (ok ? "done" : "miss") }),
      },
    ];
  },
  View: GrokNotebookView,
};
