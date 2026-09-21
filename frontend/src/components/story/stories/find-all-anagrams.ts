import type { CellTone } from "@/components/learn/viz/primitives";

import { ChecklistWindowView, type ChecklistRow, type ChecklistWindowState } from "../checklist-window-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<ChecklistWindowState>;

/** Fresh string. The basket first fills at the last letter; checking sooner is the trap. */
const PRACTICE = 's="bac" p="abc"';

const CODE = [
  "List<Integer> out = new ArrayList<>();",
  "if (s.length() < p.length()) return out;",
  "int[] need = new int[26];",
  "int[] window = new int[26];",
  "for (char c : p.toCharArray()) need[c - 'a']++;",
  "for (int i = 0; i < s.length(); i++) {",
  "    window[s.charAt(i) - 'a']++;",
  "    if (i >= p.length()) window[s.charAt(i - p.length()) - 'a']--;",
  "    if (i >= p.length() - 1 && Arrays.equals(need, window)) out.add(i - p.length() + 1);",
  "}",
  "return out;",
];

function parse(raw: string): { s: string; p: string } {
  const s = raw.match(/s\s*=\s*"([^"]*)"/)?.[1] ?? "";
  const p = raw.match(/p\s*=\s*"([^"]*)"/)?.[1] ?? "";
  return { s, p };
}

function needOf(p: string): Map<string, number> {
  const need = new Map<string, number>();
  for (const letter of p) need.set(letter, (need.get(letter) ?? 0) + 1);
  return need;
}

function sameCounts(need: number[], window: number[]): boolean {
  for (let i = 0; i < 26; i++) if (need[i] !== window[i]) return false;
  return true;
}

function solve(s: string, p: string): number[] {
  const out: number[] = [];
  if (s.length < p.length) return out;
  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  for (const c of p) need[c.charCodeAt(0) - 97]++;
  for (let i = 0; i < s.length; i++) {
    window[s.charCodeAt(i) - 97]++;
    if (i >= p.length) window[s.charCodeAt(i - p.length) - 97]--;
    if (i >= p.length - 1 && sameCounts(need, window)) out.push(i - p.length + 1);
  }
  return out;
}

function format(starts: number[]): string {
  return `[${starts.join(",")}]`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

function listFor(need: Map<string, number>, have: Map<string, number>, focus?: string, tone: ChecklistRow["tone"] = "hit"): ChecklistRow[] {
  return [...need.entries()].map(([letter, count]) => ({
    letter,
    need: count,
    have: have.get(letter) ?? 0,
    tone: letter === focus ? tone : "idle",
  }));
}

function haveOf(chars: string[], from: number, to: number): Map<string, number> {
  const have = new Map<string, number>();
  for (let index = from; index <= to; index++) have.set(chars[index], (have.get(chars[index]) ?? 0) + 1);
  return have;
}

function blank(chars: string[], need: Map<string, number>): ChecklistWindowState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null, list: listFor(need, new Map()), counting: false, best: null };
}

function pictureFrames(s: string, p: string, starts: number[]): Frame[] {
  const chars = [...s];
  const need = needOf(p);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `This is "${s}". The list is the letters of "${p}". We want every neighbour run of length ${p.length} that matches the list.`,
      state: blank(chars, need),
    },
  ];
  if (starts.length === 0) {
    frames.push({
      scene: "picture",
      caption: `No run of length ${p.length} matches the list. The answer is an empty list of starts.`,
      state: { ...blank(chars, need), tones: tones(chars.length, () => "faded") },
    });
    frames.push({
      scene: "picture",
      caption: "The goal: every start index of a matching basket.",
      state: blank(chars, need),
    });
    return frames;
  }
  const first = starts[0];
  frames.push({
    scene: "picture",
    caption: `"${s.slice(first, first + p.length)}" uses the same letters as "${p}", so it is allowed. It starts at box ${first}.`,
    state: {
      ...blank(chars, need),
      left: first,
      right: first + p.length - 1,
      tones: tones(chars.length, range(first, first + p.length - 1, "done")),
      list: listFor(need, haveOf(chars, first, first + p.length - 1)),
      counting: true,
    },
  });
  if (p.length > 1) {
    frames.push({
      scene: "picture",
      caption: `"${s.slice(0, p.length - 1)}" is too short. A basket of length ${p.length - 1} is not asked against the list.`,
      state: {
        ...blank(chars, need),
        left: 0,
        right: p.length - 2,
        tones: tones(chars.length, range(0, p.length - 2, "miss")),
        list: listFor(need, haveOf(chars, 0, p.length - 2), chars[0], "miss"),
        counting: true,
      },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: every start index of a matching basket. Here the starts are ${format(starts)}.`,
    state: {
      ...blank(chars, need),
      tones: tones(chars.length, (index) => (starts.some((start) => index >= start && index < start + p.length) ? "done" : null)),
      counting: true,
      list: listFor(need, haveOf(chars, first, first + p.length - 1)),
    },
  });
  return frames;
}

function slowFrames(s: string, p: string, starts: number[]): Frame[] {
  const chars = [...s];
  const need = needOf(p);
  const frames: Frame[] = [];
  const key = [...p].sort().join("");
  let total = 0;
  const m = p.length;
  for (let start = 0; start + m <= s.length; start++) {
    const slice = s.slice(start, start + m);
    total += m;
    const hit = [...slice].sort().join("") === key;
    if (start > 2) continue;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: take every run of length ${m} and sort it. "${slice}" ${hit ? "matches" : "does not match"} "${p}".`
          : `Go back, take the run starting at box ${start}, and sort those ${m} letters again. "${slice}" ${hit ? "matches" : "does not"}.`,
      state: {
        ...blank(chars, need),
        left: start,
        right: start + m - 1,
        tones: tones(chars.length, range(start, start + m - 1, hit ? "done" : "miss")),
        list: listFor(need, haveOf(chars, start, start + m - 1), undefined, hit ? "hit" : "miss"),
        counting: true,
        counter: { label: "letters sorted", value: total },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That sorted ${total} letters for a string of ${s.length}. This is far slower than one pass. The starts we want are ${format(starts)}.`,
    state: { ...blank(chars, need), tones: tones(chars.length, () => "faded"), counter: { label: "letters sorted", value: total } },
  });
  return frames;
}

function insightFrames(s: string, p: string, starts: number[]): Frame[] {
  const chars = [...s];
  const need = needOf(p);
  const m = p.length;
  if (s.length < m) {
    return [
      {
        scene: "insight",
        caption: `Picture a shopper with a basket that holds exactly ${m} letters. "${s}" is shorter than the list, so no basket fits.`,
        state: blank(chars, need),
      },
    ];
  }
  const filling = Math.min(m - 1, s.length) - 1;
  const fullRight = m - 1;
  return [
    {
      scene: "insight",
      caption: `Picture a shopper. The basket is a cutter of length ${m}. It must fill before we ask the list.`,
      state: {
        ...blank(chars, need),
        left: 0,
        right: Math.max(filling, 0),
        tones: tones(chars.length, range(0, Math.max(filling, 0), "window")),
        list: listFor(need, haveOf(chars, 0, Math.max(filling, 0))),
        counting: true,
      },
    },
    {
      scene: "insight",
      caption: `The Off-By-One Trap! Asking the list while the basket holds ${m - 1} letters misses the first full basket, start 0.`,
      state: {
        ...blank(chars, need),
        left: 0,
        right: Math.max(filling, 0),
        tones: tones(chars.length, range(0, Math.max(filling, 0), "miss")),
        list: listFor(need, haveOf(chars, 0, Math.max(filling, 0)), chars[0], "miss"),
        counting: true,
      },
    },
    {
      scene: "insight",
      caption: `When the basket first holds ${m} letters, we ask the list. "${s.slice(0, m)}" ${starts[0] === 0 ? "matches, so we record start 0." : "does not match, and we slide on."}`,
      state: {
        ...blank(chars, need),
        left: 0,
        right: fullRight,
        tones: tones(chars.length, range(0, fullRight, starts[0] === 0 ? "done" : "window")),
        list: listFor(need, haveOf(chars, 0, fullRight), chars[fullRight], starts[0] === 0 ? "hit" : "idle"),
        counting: true,
      },
    },
  ];
}

function solutionFrames(s: string, p: string, scene: SceneId = "solution", practice = false): Frame[] {
  const chars = [...s];
  const needMap = needOf(p);
  const m = p.length;
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  for (const c of p) need[c.charCodeAt(0) - 97]++;
  const out: number[] = [];
  let askedEarly = false;
  let askedMatch = false;

  const haveMap = () => {
    const have = new Map<string, number>();
    for (const [letter] of needMap) have.set(letter, window[letter.charCodeAt(0) - 97]);
    return have;
  };
  const base = (left: number | null, right: number | null, focus?: string, tone: ChecklistRow["tone"] = "hit"): ChecklistWindowState => ({
    chars,
    tones: right === null ? tones(chars.length, () => null) : tones(chars.length, (index) => (left !== null && index < left ? "faded" : index === right ? "edge" : left !== null ? range(left, right, "window")(index) : null)),
    left,
    right,
    list: listFor(needMap, haveMap(), focus, tone),
    counting: true,
    best: null,
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new string: "${s}". The list is "${p}". The basket must hold ${m} letters before we ask.`
      : `The shopper starts with an empty basket. The list is the letters of "${p}". The basket size is ${m}.`,
    codeLine: line(4),
    state: { ...base(null, null), counting: false, list: listFor(needMap, new Map()) },
  });

  if (s.length < m) {
    frames.push({
      scene,
      caption: `The string is shorter than the list. No basket fits. The answer is ${format(out)}.`,
      codeLine: line(1),
      state: { ...blank(chars, needMap), tones: tones(chars.length, () => "faded") },
    });
    return frames;
  }

  for (let i = 0; i < s.length; i++) {
    const added = chars[i];
    window[added.charCodeAt(0) - 97]++;
    const dropAt = i - m;
    if (i >= m) window[chars[dropAt].charCodeAt(0) - 97]--;
    const left = i >= m - 1 ? i - m + 1 : 0;
    const full = i >= m - 1;
    const match = full && sameCounts(need, window);

    if (!full) {
      const early: Frame = {
        scene,
        caption: `The basket holds "${s.slice(0, i + 1)}", length ${i + 1}. That is short of ${m}, so we do not ask the list yet.`,
        codeLine: line(6),
        state: { ...base(0, i, added), ask: "edge" },
      };
      if ((practice || !askedEarly) && m > 1 && i === m - 2) {
        askedEarly = true;
        early.quiz = {
          kind: "choice",
          options: [`Not yet. The basket must hold ${m} letters.`, "Yes. Ask the list now."],
          answer: 0,
          question: `The basket is not full. Do we ask the list?`,
          why: `A short basket is the Off-By-One Trap. Wait until it holds ${m} letters.`,
        };
      }
      frames.push(early);
      if (i === m - 2 && !practice) {
        frames.push({
          scene,
          caption: `The Off-By-One Trap! Asking now would skip the first full basket. Wait until the basket holds ${m} letters.`,
          codeLine: line(8),
          state: { ...base(0, i, added, "miss"), tones: tones(chars.length, range(0, i, "miss")) },
        });
      }
      continue;
    }

    if (i >= m) {
      const quiet = !match && !practice && i !== m;
      if (quiet) {
        // Keep one frame per miss after the first slide, not a speech per letter.
        const last = frames[frames.length - 1];
        if (last && last.caption.startsWith("The basket slides")) {
          last.caption = `The basket slides on. "${s.slice(left, i + 1)}" still does not match the list.`;
          last.state = base(left, i, added, "idle");
          last.codeLine = line(7);
          continue;
        }
      }
      frames.push({
        scene,
        caption: `The basket slides: it takes '${added}' and drops '${chars[dropAt]}'. Now it holds "${s.slice(left, i + 1)}".`,
        codeLine: line(7),
        state: base(left, i, added, match ? "hit" : "idle"),
      });
    } else {
      const filled: Frame = {
        scene,
        caption: `The basket just filled: "${s.slice(left, i + 1)}". Now we ask the list.`,
        codeLine: line(8),
        state: { ...base(left, i, added, match ? "hit" : "idle"), ask: "edge" },
      };
      if (practice || !askedMatch) {
        askedMatch = true;
        const feedback: Record<number, string> = {};
        chars.forEach((_, index) => {
          if (index === left) return;
          feedback[index] = index === i ? `That is the last letter in. The start of this basket is the other end.` : `That box is not the start of this basket.`;
        });
        filled.quiz = {
          kind: "cell",
          cells: chars.length,
          numbered: false,
          question: match
            ? `The list matches. Click the first letter of this basket, the start we record.`
            : `The list does not match. Click the first letter of this basket anyway, so we know where it starts.`,
          answer: left,
          feedback,
          otherwise: `The start is the left end of the basket.`,
          why: `The basket is length ${m}, so its start is this left letter.`,
        };
      }
      frames.push(filled);
    }

    if (match) {
      out.push(left);
      frames.push({
        scene,
        caption: `The list is fully ticked. Record start ${left}. Starts so far: ${format(out)}.`,
        codeLine: line(8),
        state: { ...base(left, i, added, "hit"), tones: tones(chars.length, range(left, i, "done")) },
      });
    }
  }

  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is ${format(out)}. You waited until the basket was full.`
      : `The shopper reached the end. The answer is ${format(out)}.`,
    codeLine: line(10),
    state: {
      ...blank(chars, needMap),
      counting: true,
      list: listFor(needMap, haveOf(chars, 0, -1)),
      tones: tones(chars.length, (index) => (out.some((start) => index >= start && index < start + m) ? "done" : "faded")),
    },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${s.length} letters enters the basket once and leaves once.`,
      codeLine: 5,
      state: { ...blank(chars, needMap), counting: true, list: listFor(needMap, haveMap()), counter: { label: "letters read", value: s.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The list and the basket are 26 letter counts, no matter how long the string is.`,
      codeLine: 2,
      state: { ...blank(chars, needMap), counting: true, list: listFor(needMap, haveMap()).map((row) => ({ ...row, tone: "hit" as const })) },
    });
  }
  return frames;
}

export const findAllAnagramsStory: ProblemStory<ChecklistWindowState> = {
  slugs: ["lc-438"],
  pattern: "Fixed window, anagrams",
  trigger: "every start index of a scrambled copy of one word inside another",
  insight: "A shopper with a basket that always holds as many letters as the list. Fill it first, then slide: take one, drop one, and record a start when the list is ticked.",
  metaphor: {
    name: "The grocery checklist",
    legend: "basket = the window of length |p| · list = need counts · tick = counts match",
    terms: ["basket", "list", "shopper", "tick"],
  },
  traps: [
    {
      name: "The Off-By-One Trap",
      rule: "Do not ask the list until the basket holds |p| letters (i >= |p| - 1). Asking sooner, or waiting one extra letter, misses the first start.",
    },
  ],
  template: [
    "write the list from p;",
    "for each letter of s {",
    "    take it into the basket;",
    "    if the basket is too long, drop the letter that left;",
    "    if the basket is full and the list is ticked, record the start;",
    "}",
  ],
  complexity: {
    slow: "O(n m log m)",
    time: "O(n)",
    timeWhy: "each letter of s enters and leaves the basket once",
    space: "O(1)",
    spaceWhy: "two arrays of 26 counts",
  },
  code: CODE,
  examples: [
    { label: 's="cbaebabacd" p="abc"', input: 's="cbaebabacd" p="abc"', expected: "[0,6]" },
    { label: 's="abab" p="ab"', input: 's="abab" p="ab"', expected: "[0,1,2]" },
    { label: 's="aa" p="bb"', input: 's="aa" p="bb"', expected: "[]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-567", title: "Permutation in String" },
    { slug: "lc-76", title: "Minimum Window Substring" },
    { slug: "lc-49", title: "Group Anagrams" },
  ],
  answer: (input) => {
    const { s, p } = parse(input);
    return format(solve(s, p));
  },
  frames: (input) => {
    const { s, p } = parse(input);
    const starts = solve(s, p);
    const practice = parse(PRACTICE);
    const chars = [...s];
    const need = needOf(p);
    const first = starts[0];
    return [
      ...pictureFrames(s, p, starts),
      ...slowFrames(s, p, starts),
      ...insightFrames(s, p, starts),
      ...solutionFrames(s, p),
      ...solutionFrames(practice.s, practice.p, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state:
          first === undefined
            ? { ...blank(chars, need), tones: tones(chars.length, () => "faded") }
            : {
                ...blank(chars, need),
                left: first,
                right: first + p.length - 1,
                tones: tones(chars.length, range(first, first + p.length - 1, "done")),
                list: listFor(need, haveOf(chars, first, first + p.length - 1)),
                counting: true,
              },
      },
    ];
  },
  View: ChecklistWindowView,
};
