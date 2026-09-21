import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokStringRowView, type GrokStringRowState } from "../grok-string-row-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokStringRowState>;

const PRACTICE = "ababc";

const CODE = [
  "int[] lastIndex = new int[26];",
  "for (int i = 0; i < s.length(); i++) {",
  "    lastIndex[s.charAt(i) - 'a'] = i;",
  "}",
  "List<Integer> out = new ArrayList<>();",
  "int start = 0;",
  "int end = 0;",
  "for (int i = 0; i < s.length(); i++) {",
  "    end = Math.max(end, lastIndex[s.charAt(i) - 'a']);",
  "    if (i == end) {",
  "        out.add(end - start + 1);",
  "        start = i + 1;",
  "    }",
  "}",
  "return out;",
];

function parse(raw: string): string {
  return raw.trim().replace(/^"|"$/g, "");
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function lastMap(s: string): { key: string; index: number; tone: "idle" | "hit" | "miss" }[] {
  const last = new Map<string, number>();
  for (let i = 0; i < s.length; i++) last.set(s[i], i);
  return [...last.entries()].map(([key, index]) => ({ key, index, tone: "idle" as const }));
}

function blank(s: string): GrokStringRowState {
  return { chars: s.split(""), tones: tones(s.length, () => null), left: null, right: null, band: null, lastSeen: null, trapCut: null, result: null, note: null, trapNote: null, counter: null };
}

/** Independent: grow each part by rescanning for last copies. */
function solve(s: string): number[] {
  const out: number[] = [];
  let start = 0;
  while (start < s.length) {
    let end = start;
    for (let i = start; i <= end; i++) {
      for (let j = s.length - 1; j > end; j--) {
        if (s[j] === s[i]) {
          end = j;
          break;
        }
      }
    }
    out.push(end - start + 1);
    start = end + 1;
  }
  return out;
}

function greedy(s: string): number[] {
  const last: number[] = Array.from({ length: 26 }, () => 0);
  for (let i = 0; i < s.length; i++) last[s.charCodeAt(i) - 97] = i;
  const out: number[] = [];
  let start = 0;
  let end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last[s.charCodeAt(i) - 97]);
    if (i === end) {
      out.push(end - start + 1);
      start = i + 1;
    }
  }
  return out;
}

function pictureFrames(s: string): Frame[] {
  const parts = greedy(s);
  const chars = s.split("");
  let at = 0;
  const bands: [number, number][] = parts.map((size) => {
    const band: [number, number] = [at, at + size - 1];
    at += size;
    return band;
  });
  const early = chars.findIndex((ch, i) => i > 0 && ch !== chars[0] && s.lastIndexOf(chars[0]) > i);
  return [
    { scene: "picture", caption: `Each box is a letter. A part may use a letter only if every copy of that letter sits inside it.`, state: blank(s) },
    {
      scene: "picture",
      caption: bands[0] ? `The first allowed part is "${s.slice(bands[0][0], bands[0][1] + 1)}", size ${parts[0]}.` : "The row is empty.",
      state: { ...blank(s), band: bands[0] ?? null, tones: tones(s.length, (i) => (bands[0] && i >= bands[0][0] && i <= bands[0][1] ? "done" : null)) },
    },
    early >= 0
      ? {
          scene: "picture",
          caption: `Cutting at the first new letter would split "${s.slice(0, early)}" too early. A letter already inside still appears later.`,
          state: { ...blank(s), trapCut: early - 1, trapNote: "too early", tones: tones(s.length, (i) => (i === early ? "miss" : i < early ? "window" : null)) },
        }
      : {
          scene: "picture",
          caption: "Each letter is its own part when no letter repeats.",
          state: { ...blank(s), tones: tones(s.length, () => "done") },
        },
    {
      scene: "picture",
      caption: `The goal: as many parts as possible. The sizes are [${parts.join(", ")}].`,
      state: { ...blank(s), result: `[${parts.join(", ")}]`, tones: tones(s.length, (i) => (bands.some(([a]) => i === a) ? "done" : "window")) },
    },
  ];
}

function slowFrames(s: string): Frame[] {
  const frames: Frame[] = [];
  let scans = 0;
  let start = 0;
  let shown = 0;
  while (start < s.length) {
    let end = start;
    for (let i = start; i <= end; i++) {
      for (let j = s.length - 1; j > end; j--) {
        scans++;
        if (s[j] === s[i]) {
          end = j;
          break;
        }
      }
    }
    if (shown < 3) {
      shown++;
      frames.push({
        scene: "slow",
        caption: start === 0
          ? `The slow way: from the start, scan right for the last copy of every letter in the part.`
          : `Start a new part at box ${start} and scan again through letters you already read.`,
        state: { ...blank(s), left: { index: start, label: "start" }, right: { index: end, label: "end" }, band: [start, end], counter: { label: "letters scanned", value: String(scans) } },
      });
    }
    start = end + 1;
  }
  frames.push({
    scene: "slow",
    caption: `We scanned ${scans} later letters while growing parts. This is O(n²) time.`,
    state: { ...blank(s), tones: tones(s.length, () => "faded"), counter: { label: "letters scanned", value: String(scans) } },
  });
  return frames;
}

function insightFrames(s: string): Frame[] {
  const last = lastMap(s);
  const firstNew = s.split("").findIndex((ch, i) => i > 0 && ch !== s[0]);
  const lastOfFirst = s.lastIndexOf(s[0] ?? "");
  return [
    {
      scene: "insight",
      caption: "Picture a fence at the last copy of every letter in the part. Record those last boxes first.",
      state: { ...blank(s), lastSeen: last },
    },
    {
      scene: "insight",
      caption: firstNew >= 0 && lastOfFirst > firstNew
        ? `Letter ${s[firstNew]} is new, but the fence must still reach the last ${s[0]} at box ${lastOfFirst}.`
        : "Walk left to right, stretching the fence, and cut only when you land on it.",
      state: {
        ...blank(s),
        lastSeen: last.map((e) => ({ ...e, tone: e.key === s[0] ? "hit" : "idle" })),
        band: [0, Math.max(0, lastOfFirst)],
        right: { index: Math.max(0, lastOfFirst), label: "fence" },
      },
    },
    {
      scene: "insight",
      caption: "The First Sight Trap would cut as soon as a new letter appears. Stretch the fence first.",
      state: { ...blank(s), trapCut: Math.max(0, firstNew - 1), trapNote: "The First Sight Trap", lastSeen: last },
    },
  ];
}

function fenceQuiz(cells: number, end: number, here: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let i = 0; i < cells; i++) {
    if (i === end) continue;
    feedback[i] = i === here ? "That is the First Sight Trap. A new letter does not close the part." : "The fence sits at the last copy of a letter already inside the part.";
  }
  return {
    kind: "cell",
    cells,
    numbered: true,
    question: "A new letter arrived. Where does the fence sit now? Click that box.",
    answer: end,
    feedback,
    otherwise: "The fence sits at the last copy of every letter already in the part.",
    why: "A letter already inside may still appear later. Stretch the fence to that last box before you cut.",
  };
}

function cutQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "We now stand on the fence. What do we do?",
    options: ["Keep walking. A later letter might still belong here", "Cut. This part is closed, and record its size"],
    answer: 1,
    why: "When the walk lands on the fence, every letter in the part has been covered. Cut and start the next part.",
  };
}

function solutionFrames(s: string, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const lastArr: number[] = Array.from({ length: 26 }, () => 0);
  for (let i = 0; i < s.length; i++) lastArr[s.charCodeAt(i) - 97] = i;
  const lastSeen = lastMap(s);
  let start = 0;
  let end = 0;
  const parts: number[] = [];
  let askedFence = false;
  let askedCut = false;
  let showedTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new row: "${s}". You stretch the fence and choose the cuts.` : "Record the last box of each letter. The fence starts at 0.",
    codeLine: line(6),
    state: { ...blank(s), lastSeen, left: { index: 0, label: "start" }, right: { index: 0, label: "fence" } },
  });

  for (let i = 0; i < s.length; i++) {
    const stretched = lastArr[s.charCodeAt(i) - 97];
    const isNew = stretched > end && i > start;
    const look: Frame = {
      scene,
      caption: `Read letter ${s[i]}. Its last copy sits at box ${stretched}.`,
      codeLine: line(8),
      state: {
        ...blank(s),
        lastSeen: lastSeen.map((e) => ({ ...e, tone: e.key === s[i] ? "hit" : "idle" })),
        left: { index: start, label: "start" },
        right: { index: end, label: "fence" },
        band: [start, Math.max(end, i)],
        tones: tones(s.length, (j) => (j === i ? "edge" : j >= start && j <= end ? "window" : j < start ? "faded" : null)),
      },
    };
    if (isNew && (practice || !askedFence)) {
      askedFence = true;
      look.quiz = fenceQuiz(s.length, Math.max(end, stretched), i);
    }
    frames.push(look);
    if (isNew && stretched > i && !showedTrap && !practice) {
      showedTrap = true;
      frames.push({
        scene,
        caption: `The First Sight Trap! Cutting here would leave later copies of a letter already in the part.`,
        codeLine: line(8),
        state: { ...blank(s), trapCut: i - 1, trapNote: "The First Sight Trap", lastSeen, left: { index: start, label: "start" }, band: [start, i - 1] },
      });
    }
    end = Math.max(end, stretched);
    if (i === end) {
      const cut: Frame = {
        scene,
        caption: `The walk is standing on the fence.`,
        codeLine: line(9),
        state: { ...blank(s), lastSeen, left: { index: start, label: "start" }, right: { index: end, label: "fence" }, band: [start, end], tones: tones(s.length, (j) => (j >= start && j <= end ? "done" : j < start ? "faded" : null)) },
      };
      if (practice || !askedCut) {
        askedCut = true;
        cut.quiz = cutQuiz();
      }
      frames.push(cut);
      parts.push(end - start + 1);
      frames.push({
        scene,
        caption: `Cut. This part has size ${end - start + 1}. Sizes so far: [${parts.join(", ")}].`,
        codeLine: line(10),
        state: { ...blank(s), lastSeen, result: `[${parts.join(", ")}]`, band: [start, end], tones: tones(s.length, (j) => (j >= start && j <= end ? "done" : j < start ? "faded" : null)) },
      });
      start = i + 1;
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is [${parts.join(", ")}]. You chose every cut.` : `The walk reached the end. The answer is [${parts.join(", ")}].`,
    codeLine: line(14),
    state: { ...blank(s), result: `[${parts.join(", ")}]`, lastSeen, tones: tones(s.length, () => "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). One pass to record last boxes, then one pass to cut.`,
      codeLine: 1,
      state: { ...blank(s), result: `[${parts.join(", ")}]`, counter: { label: "letters read", value: String(s.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). A last-box row of 26 letters, plus the list of sizes.",
      codeLine: 0,
      state: { ...blank(s), result: `[${parts.join(", ")}]`, lastSeen, counter: { label: "last-box slots", value: "26" } },
    });
  }
  return frames;
}

export const partitionLabelsStory: ProblemStory<GrokStringRowState> = {
  slugs: ["lc-763"],
  pattern: "Greedy: last-seen partition",
  trigger: "cut a string into as many parts as you can, and each letter may appear in at most one part",
  insight: "A fence at the last copy of every letter in the part. Stretch the fence as you walk, and cut only when you land on it.",
  metaphor: { name: "The last-seen fence", legend: "fence = end · start = start of the part · last box = lastIndex[letter]", terms: ["fence", "part", "letter", "cut"] },
  traps: [
    {
      name: "The First Sight Trap",
      rule: "A new letter does not close the part. Stretch the fence to the last copy of every letter already inside, then cut when you land on it.",
    },
  ],
  template: [
    "record last index of each letter",
    "end = 0, start = 0",
    "for each i: end = max(end, last[s[i]])",
    "    if i == end: cut, start = i + 1",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "one pass to record last indices, then one pass to cut",
    space: "O(1)",
    spaceWhy: "a last-index array of length 26, plus the output list",
  },
  code: CODE,
  examples: [
    { label: "ababcc", input: "ababcc", expected: "[4, 2]" },
    { label: "abc", input: "abc", expected: "[1, 1, 1]" },
    { label: "aba", input: "aba", expected: "[3]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-56", title: "Merge Intervals" },
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
    { slug: "lc-438", title: "Find All Anagrams in a String" },
  ],
  answer: (input) => `[${solve(parse(input)).join(", ")}]`,
  frames: (input) => {
    const s = parse(input);
    const parts = greedy(s);
    return [
      ...pictureFrames(s),
      ...slowFrames(s),
      ...insightFrames(s),
      ...solutionFrames(s),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(s), result: `[${parts.join(", ")}]`, lastSeen: lastMap(s), tones: tones(s.length, () => "done") },
      },
    ];
  },
  View: GrokStringRowView,
};
