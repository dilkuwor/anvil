import type { CellTone } from "@/components/learn/viz/primitives";

import { ChecklistWindowView, type ChecklistRow, type ChecklistWindowState } from "../checklist-window-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<ChecklistWindowState>;

/** Fresh string. a and b have a hole between them, so a subsequence is not enough. */
const PRACTICE = 's1="ab" s2="axb"';

const CODE = [
  "if (s1.length() > s2.length()) return false;",
  "int[] need = new int[26];",
  "int[] window = new int[26];",
  "for (char c : s1.toCharArray()) need[c - 'a']++;",
  "for (int i = 0; i < s2.length(); i++) {",
  "    window[s2.charAt(i) - 'a']++;",
  "    if (i >= s1.length()) window[s2.charAt(i - s1.length()) - 'a']--;",
  "    if (Arrays.equals(need, window)) return true;",
  "}",
  "return false;",
];

function parse(raw: string): { s1: string; s2: string } {
  const s1 = raw.match(/s1\s*=\s*"([^"]*)"/)?.[1] ?? "";
  const s2 = raw.match(/s2\s*=\s*"([^"]*)"/)?.[1] ?? "";
  return { s1, s2 };
}

function needOf(s1: string): Map<string, number> {
  const need = new Map<string, number>();
  for (const letter of s1) need.set(letter, (need.get(letter) ?? 0) + 1);
  return need;
}

function sameCounts(need: number[], window: number[]): boolean {
  for (let i = 0; i < 26; i++) if (need[i] !== window[i]) return false;
  return true;
}

function solve(s1: string, s2: string): boolean {
  if (s1.length > s2.length) return false;
  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  for (const c of s1) need[c.charCodeAt(0) - 97]++;
  for (let i = 0; i < s2.length; i++) {
    window[s2.charCodeAt(i) - 97]++;
    if (i >= s1.length) window[s2.charCodeAt(i - s1.length) - 97]--;
    if (sameCounts(need, window)) return true;
  }
  return false;
}

function firstMatch(s1: string, s2: string): number | null {
  const m = s1.length;
  const key = [...s1].sort().join("");
  for (let start = 0; start + m <= s2.length; start++) {
    if ([...s2.slice(start, start + m)].sort().join("") === key) return start;
  }
  return null;
}

function gapPair(s1: string, s2: string): { a: number; b: number } | null {
  if (s1.length !== 2) return null;
  const [x, y] = s1;
  const first = s2.indexOf(x);
  const second = s2.indexOf(y);
  if (first < 0 || second < 0) return null;
  const a = Math.min(first, second);
  const other = x === s2[a] ? y : x;
  const later = s2.indexOf(other, a + 1);
  if (later < 0) return null;
  if (later === a + 1) return null;
  return { a, b: later };
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

function pictureFrames(s1: string, s2: string, ok: boolean): Frame[] {
  const chars = [...s2];
  const need = needOf(s1);
  const m = s1.length;
  const hit = firstMatch(s1, s2);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `The list is "${s1}". We look inside "${s2}" for a neighbour run of length ${m} that matches the list.`,
      state: blank(chars, need),
    },
  ];
  if (hit !== null) {
    frames.push({
      scene: "picture",
      caption: `"${s2.slice(hit, hit + m)}" uses the same letters as "${s1}", so it is allowed. The answer is yes.`,
      state: {
        ...blank(chars, need),
        left: hit,
        right: hit + m - 1,
        tones: tones(chars.length, range(hit, hit + m - 1, "done")),
        list: listFor(need, haveOf(chars, hit, hit + m - 1)),
        counting: true,
      },
    });
  } else {
    const gap = gapPair(s1, s2);
    if (gap) {
      frames.push({
        scene: "picture",
        caption: `'${chars[gap.a]}' and '${chars[gap.b]}' are on the list, but a letter sits between them. That is not a neighbour run.`,
        state: {
          ...blank(chars, need),
          tones: tones(chars.length, (index) => (index === gap.a || index === gap.b ? "miss" : index > gap.a && index < gap.b ? "faded" : null)),
          counting: true,
          list: listFor(need, haveOf(chars, gap.a, gap.b), undefined, "miss"),
        },
      });
    } else {
      frames.push({
        scene: "picture",
        caption: `No neighbour run of length ${m} matches the list. The answer is no.`,
        state: { ...blank(chars, need), tones: tones(chars.length, () => "faded") },
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: `The goal: say yes if any basket of length ${m} matches the list, otherwise no. Here the answer is ${ok ? "yes" : "no"}.`,
    state:
      hit !== null
        ? {
            ...blank(chars, need),
            left: hit,
            right: hit + m - 1,
            tones: tones(chars.length, range(hit, hit + m - 1, "done")),
            list: listFor(need, haveOf(chars, hit, hit + m - 1)),
            counting: true,
          }
        : { ...blank(chars, need), tones: tones(chars.length, () => "faded") },
  });
  return frames;
}

function slowFrames(s1: string, s2: string, ok: boolean): Frame[] {
  const chars = [...s2];
  const need = needOf(s1);
  const m = s1.length;
  const key = [...s1].sort().join("");
  const frames: Frame[] = [];
  let total = 0;
  if (s1.length > s2.length) {
    frames.push({
      scene: "slow",
      caption: `The slow way would sort every slice. The list is already longer than the string, so no slice fits.`,
      state: { ...blank(chars, need), counter: { label: "slices tried", value: 0 } },
    });
    frames.push({
      scene: "slow",
      caption: `Zero slices for a list of ${m} and a string of ${s2.length}. Still a lot of sorting when the string is long. This is the slow cost.`,
      state: { ...blank(chars, need), tones: tones(chars.length, () => "faded") },
    });
    return frames;
  }
  for (let start = 0; start + m <= s2.length; start++) {
    const slice = s2.slice(start, start + m);
    total += m;
    const hit = [...slice].sort().join("") === key;
    if (start > 2 && !hit) continue;
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: take every run of length ${m} and sort it. "${slice}" ${hit ? "matches" : "does not match"} "${s1}".`
          : `Next run, starting one letter later: "${slice}" ${hit ? "matches" : "does not"}.`,
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
    if (hit) break;
  }
  frames.push({
    scene: "slow",
    caption: `Sorting those slices is slow. We ${ok ? "do find a match" : "find no match"}, after reading ${total} letters that way.`,
    state: { ...blank(chars, need), tones: tones(chars.length, () => "faded"), counter: { label: "letters sorted", value: total } },
  });
  return frames;
}

function insightFrames(s1: string, s2: string, ok: boolean): Frame[] {
  const chars = [...s2];
  const need = needOf(s1);
  const m = s1.length;
  const hit = firstMatch(s1, s2);
  const gap = gapPair(s1, s2);
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: `Picture a shopper. The basket is a cutter of length ${m}. Only a neighbour run that size can match the list.`,
      state: {
        ...blank(chars, need),
        left: 0,
        right: Math.min(m - 1, chars.length - 1),
        tones: tones(chars.length, range(0, Math.min(m - 1, chars.length - 1), "window")),
        list: listFor(need, haveOf(chars, 0, Math.min(m - 1, chars.length - 1))),
        counting: true,
      },
    },
  ];
  if (gap && !ok) {
    frames.push({
      scene: "insight",
      caption: `The Gap Trap! '${chars[gap.a]}' and '${chars[gap.b]}' appear in order, with a hole between them. That is a skip, not a basket.`,
      state: {
        ...blank(chars, need),
        tones: tones(chars.length, (index) => (index === gap.a || index === gap.b ? "miss" : index > gap.a && index < gap.b ? "faded" : null)),
        list: listFor(need, haveOf(chars, gap.a, gap.b), undefined, "miss"),
        counting: true,
      },
    });
    frames.push({
      scene: "insight",
      caption: `The shopper only asks the list for a basket of ${m} neighbours. A skip across a hole never counts.`,
      state: {
        ...blank(chars, need),
        left: gap.a,
        right: gap.b,
        tones: tones(chars.length, (index) => (index === gap.a || index === gap.b ? "miss" : range(gap.a, gap.b, "window")(index))),
        counting: true,
        list: listFor(need, haveOf(chars, gap.a, gap.b), undefined, "miss"),
      },
    });
    return frames;
  }
  if (hit !== null) {
    frames.push({
      scene: "insight",
      caption: `Slide the cutter. When it sits on "${s2.slice(hit, hit + m)}", the list is ticked, so we stop. The answer is yes.`,
      state: {
        ...blank(chars, need),
        left: hit,
        right: hit + m - 1,
        tones: tones(chars.length, range(hit, hit + m - 1, "done")),
        list: listFor(need, haveOf(chars, hit, hit + m - 1)),
        counting: true,
      },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: `Slide the cutter along the whole string. No basket of ${m} neighbours ticks the list. The answer is no.`,
      state: { ...blank(chars, need), tones: tones(chars.length, () => "faded"), counting: true, list: listFor(need, new Map()) },
    });
  }
  return frames;
}

function solutionFrames(s1: string, s2: string, scene: SceneId = "solution", practice = false): Frame[] {
  const chars = [...s2];
  const needMap = needOf(s1);
  const m = s1.length;
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const gap = gapPair(s1, s2);
  let askedGap = false;
  let askedMatch = false;

  if (s1.length > s2.length) {
    frames.push({
      scene,
      caption: practice ? `Your turn. The list "${s1}" is longer than "${s2}". Can a basket fit?` : `The list is longer than the string. No basket fits.`,
      codeLine: line(0),
      state: blank(chars, needMap),
      quiz: {
        kind: "choice",
        options: ["No. Return no at once.", "Yes. Keep walking anyway."],
        answer: 0,
        question: `The list is longer than the string. Does a basket fit?`,
        why: `A basket of that size cannot sit inside a shorter string.`,
      },
    });
    frames.push({
      scene,
      caption: `No basket fits. The answer is false.`,
      codeLine: line(0),
      state: { ...blank(chars, needMap), tones: tones(chars.length, () => "faded") },
    });
    if (!practice) {
      frames.push({
        scene,
        caption: `Time: O(n). We would walk s2 once when the list fits. Here we stop at once.`,
        codeLine: 4,
        state: { ...blank(chars, needMap), counter: { label: "letters read", value: 0 } },
      });
      frames.push({
        scene,
        caption: `Space: O(1). The list and the basket are 26 letter counts.`,
        codeLine: 1,
        state: { ...blank(chars, needMap), counting: true, list: listFor(needMap, new Map()) },
      });
    }
    return frames;
  }

  const need = new Array(26).fill(0);
  const window = new Array(26).fill(0);
  for (const c of s1) need[c.charCodeAt(0) - 97]++;
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
      ? `Your turn, on a new string: "${s2}". The list is "${s1}". Only a neighbour basket of ${m} letters can match.`
      : `The shopper starts with an empty basket of size ${m}. The list is "${s1}".`,
    codeLine: line(3),
    state: { ...base(null, null), counting: false, list: listFor(needMap, new Map()) },
  });

  for (let i = 0; i < s2.length; i++) {
    const added = chars[i];
    window[added.charCodeAt(0) - 97]++;
    if (i >= m) window[chars[i - m].charCodeAt(0) - 97]--;
    const full = i >= m - 1;
    const left = full ? i - m + 1 : 0;
    const match = full && sameCounts(need, window);

    if (!full) {
      frames.push({
        scene,
        caption: `The basket takes '${added}'. It holds "${s2.slice(0, i + 1)}", still short of ${m}.`,
        codeLine: line(5),
        state: base(0, i, added),
      });
      continue;
    }

    if (i >= m) {
      frames.push({
        scene,
        caption: `The basket slides: it takes '${added}' and drops '${chars[i - m]}'. Now "${s2.slice(left, i + 1)}".`,
        codeLine: line(6),
        state: base(left, i, added, match ? "hit" : "idle"),
      });
    } else {
      const filled: Frame = {
        scene,
        caption: `The basket just filled: "${s2.slice(left, i + 1)}". Now we ask the list.`,
        codeLine: line(7),
        state: base(left, i, added, match ? "hit" : "idle"),
      };
      if ((practice || !askedMatch) && !match) {
        filled.quiz = {
          kind: "choice",
          options: ["No. The counts do not match.", "Yes. The letters we need appear somewhere."],
          answer: 0,
          question: `Does this basket match the list?`,
          why: `Only this neighbour run is the basket. Letters sitting elsewhere do not help.`,
        };
      }
      frames.push(filled);
    }

    if (gap && !askedGap && i >= gap.b && !match) {
      askedGap = true;
      const trap: Frame = {
        scene,
        caption: `'${chars[gap.a]}' and '${chars[gap.b]}' are both in the string, with a hole between them.`,
        codeLine: line(7),
        state: {
          ...base(left, i),
          tones: tones(chars.length, (index) => (index === gap.a || index === gap.b ? "miss" : left !== null ? range(left, i, "window")(index) : null)),
          ask: "edge",
        },
      };
      trap.quiz = {
        kind: "choice",
        options: ["No. A hole between them is not a basket.", "Yes. The letters appear, so it counts."],
        answer: 0,
        question: `Do those two letters count as a match?`,
        why: `They are a skip across a hole. The basket only holds neighbours.`,
      };
      frames.push(trap);
      frames.push({
        scene,
        caption: `The Gap Trap! Checking a skip, not a neighbour run, would say yes. The basket must be ${m} letters side by side.`,
        codeLine: line(7),
        state: {
          ...blank(chars, needMap),
          tones: tones(chars.length, (index) => (index === gap.a || index === gap.b ? "miss" : index > gap.a && index < gap.b ? "faded" : null)),
          counting: true,
          list: listFor(needMap, haveOf(chars, gap.a, gap.b), undefined, "miss"),
        },
      });
    }

    if (match) {
      const found: Frame = {
        scene,
        caption: `The list is fully ticked. This basket matches.`,
        codeLine: line(7),
        state: { ...base(left, i, added, "hit"), tones: tones(chars.length, range(left, i, "done")), ask: "edge" },
      };
      if (practice || !askedMatch) {
        askedMatch = true;
        found.quiz = {
          kind: "choice",
          options: ["Yes. Stop and return yes.", "No. Keep sliding to find every match."],
          answer: 0,
          question: `The basket matches the list. What do we do?`,
          why: `One matching basket is enough. Return yes.`,
        };
      }
      frames.push(found);
      frames.push({
        scene,
        caption: practice ? `Done. The answer is true. You only counted neighbour baskets.` : `Stop. The answer is true.`,
        codeLine: line(7),
        state: { ...base(left, i), tones: tones(chars.length, range(left, i, "done")) },
      });
      if (!practice) {
        frames.push({
          scene,
          caption: `Time: O(n). Each letter of the string enters the basket once and leaves once.`,
          codeLine: 4,
          state: { ...base(left, i), tones: tones(chars.length, range(left, i, "done")), counter: { label: "letters read", value: i + 1 } },
        });
        frames.push({
          scene,
          caption: `Space: O(1). The list and the basket are 26 letter counts.`,
          codeLine: 1,
          state: { ...base(left, i), counting: true, list: listFor(needMap, haveMap()).map((row) => ({ ...row, tone: "hit" as const })) },
        });
      }
      return frames;
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is false. No neighbour basket matched the list.` : `The shopper reached the end. The answer is false.`,
    codeLine: line(9),
    state: { ...blank(chars, needMap), counting: true, list: listFor(needMap, haveMap()), tones: tones(chars.length, () => "faded") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${s2.length} letters entered the basket once and left once.`,
      codeLine: 4,
      state: { ...blank(chars, needMap), counting: true, list: listFor(needMap, haveMap()), counter: { label: "letters read", value: s2.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). The list and the basket are 26 letter counts.`,
      codeLine: 1,
      state: { ...blank(chars, needMap), counting: true, list: listFor(needMap, haveMap()).map((row) => ({ ...row, tone: "hit" as const })) },
    });
  }
  return frames;
}

export const permutationInStringStory: ProblemStory<ChecklistWindowState> = {
  slugs: ["lc-567"],
  pattern: "Fixed window, anagrams",
  trigger: "whether one string contains a scrambled copy of another as a neighbour run",
  insight: "A shopper with a basket the length of the list, sliding on the longer string. Only neighbours count. A skip across a hole is not a match.",
  metaphor: {
    name: "The grocery checklist",
    legend: "basket = the window of length |s1| · list = need counts · tick = counts match",
    terms: ["basket", "list", "shopper", "tick"],
  },
  traps: [
    {
      name: "The Gap Trap",
      rule: "The letters must be neighbours. Skipping holes (a subsequence) is wrong. The basket length is always |s1|.",
    },
  ],
  template: [
    "if the list is longer than the string, return no;",
    "write the list from s1;",
    "slide a basket of that length on s2;",
    "if the list is ticked, return yes;",
    "if the walk ends, return no;",
  ],
  complexity: {
    slow: "O(n m log m)",
    time: "O(n)",
    timeWhy: "each letter of s2 enters and leaves the basket once",
    space: "O(1)",
    spaceWhy: "two arrays of 26 counts",
  },
  code: CODE,
  examples: [
    { label: 's1="ab" s2="eidbaooo"', input: 's1="ab" s2="eidbaooo"', expected: "true" },
    { label: 's1="ab" s2="eidboaoo"', input: 's1="ab" s2="eidboaoo"', expected: "false", note: "a and b never sit together" },
    { label: 's1="adc" s2="dcda"', input: 's1="adc" s2="dcda"', expected: "true" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-438", title: "Find All Anagrams in a String" },
    { slug: "lc-76", title: "Minimum Window Substring" },
    { slug: "lc-49", title: "Group Anagrams" },
  ],
  answer: (input) => {
    const { s1, s2 } = parse(input);
    return String(solve(s1, s2));
  },
  frames: (input) => {
    const { s1, s2 } = parse(input);
    const ok = solve(s1, s2);
    const practice = parse(PRACTICE);
    const chars = [...s2];
    const need = needOf(s1);
    const hit = firstMatch(s1, s2);
    return [
      ...pictureFrames(s1, s2, ok),
      ...slowFrames(s1, s2, ok),
      ...insightFrames(s1, s2, ok),
      ...solutionFrames(s1, s2),
      ...solutionFrames(practice.s1, practice.s2, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state:
          hit !== null
            ? {
                ...blank(chars, need),
                left: hit,
                right: hit + s1.length - 1,
                tones: tones(chars.length, range(hit, hit + s1.length - 1, "done")),
                list: listFor(need, haveOf(chars, hit, hit + s1.length - 1)),
                counting: true,
              }
            : { ...blank(chars, need), tones: tones(chars.length, () => "faded") },
      },
    ];
  },
  View: ChecklistWindowView,
};
