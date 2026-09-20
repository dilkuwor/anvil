import type { CellTone } from "@/components/learn/viz/primitives";

import { ChecklistWindowView, type ChecklistRow, type ChecklistWindowState } from "../checklist-window-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<ChecklistWindowState>;

/** Fresh input for the "your turn" run. The second B is a spare, so it reaches the trap. */
const PRACTICE = 's="ABBCA", t="ABC"';

const CODE = [
  "Map<Character, Integer> need = new HashMap<>();",
  "for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);",
  "Map<Character, Integer> basket = new HashMap<>();",
  "int have = 0, left = 0, bestLen = Integer.MAX_VALUE, bestStart = 0;",
  "for (int right = 0; right < s.length(); right++) {",
  "    char c = s.charAt(right);",
  "    basket.merge(c, 1, Integer::sum);",
  "    if (need.containsKey(c) && basket.get(c).equals(need.get(c))) have++;",
  "    while (have == need.size()) {",
  "        if (right - left + 1 < bestLen) {",
  "            bestLen = right - left + 1;",
  "            bestStart = left;",
  "        }",
  "        char d = s.charAt(left);",
  "        basket.merge(d, -1, Integer::sum);",
  "        if (need.containsKey(d) && basket.get(d) < need.get(d)) have--;",
  "        left++;",
  "    }",
  "}",
  'return bestLen == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLen);',
];

function parse(raw: string): { s: string; t: string } {
  const s = raw.match(/s\s*=\s*"([^"]*)"/)?.[1] ?? "";
  const t = raw.match(/t\s*=\s*"([^"]*)"/)?.[1] ?? "";
  return { s, t };
}

function needOf(t: string): Map<string, number> {
  const need = new Map<string, number>();
  for (const letter of t) need.set(letter, (need.get(letter) ?? 0) + 1);
  return need;
}

type Solved = { best: [number, number] | null; firstComplete: number | null };

/** The plain algorithm, kept apart from the frame builder so the two can be checked against each other. */
function solve(s: string, t: string): Solved {
  const need = needOf(t);
  const basket = new Map<string, number>();
  let have = 0;
  let left = 0;
  let best: [number, number] | null = null;
  let firstComplete: number | null = null;
  if (t.length === 0) return { best, firstComplete };
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    basket.set(c, (basket.get(c) ?? 0) + 1);
    if (need.has(c) && basket.get(c) === need.get(c)) have++;
    while (have === need.size) {
      firstComplete ??= right;
      if (!best || right - left < best[1] - best[0]) best = [left, right];
      const d = s[left];
      basket.set(d, (basket.get(d) ?? 0) - 1);
      if (need.has(d) && (basket.get(d) ?? 0) < (need.get(d) ?? 0)) have--;
      left++;
    }
  }
  return { best, firstComplete };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function range(from: number, to: number, tone: CellTone) {
  return (index: number) => (index >= from && index <= to ? tone : null);
}

/** The list as it stands for the letters between two positions. */
function listFor(chars: string[], need: Map<string, number>, from: number, to: number, focus?: string, tone: ChecklistRow["tone"] = "hit"): ChecklistRow[] {
  return [...need.entries()].map(([letter, count]) => ({
    letter,
    need: count,
    have: chars.slice(from, to + 1).filter((char) => char === letter).length,
    tone: letter === focus ? tone : "idle",
  }));
}

function blank(chars: string[], need: Map<string, number>): ChecklistWindowState {
  return { chars, tones: tones(chars.length, () => null), left: null, right: null, list: listFor(chars, need, 0, -1), counting: false, best: null };
}

function quoted(letters: string[]): string {
  return letters.map((letter) => `'${letter}'`).join(", ");
}

function firstMissing(list: ChecklistRow[]): ChecklistRow | undefined {
  return list.find((row) => row.have < row.need);
}

function pictureFrames(chars: string[], t: string, need: Map<string, number>, solved: Solved): F[] {
  const text = chars.join("");
  const frames: F[] = [
    {
      scene: "picture",
      caption: `This is the string "${text}". The letters we need are ${[...t].join(", ")}. They are written on the list below.`,
      state: blank(chars, need),
    },
  ];
  if (!solved.best || solved.firstComplete === null) {
    frames.push({ scene: "picture", caption: "The goal: find the shortest run of neighbours that holds every letter on the list. If there is none, the answer is empty.", state: blank(chars, need) });
    return frames;
  }
  const [from, to] = solved.best;
  const loose = solved.firstComplete;
  frames.push({
    scene: "picture",
    caption: `A run of neighbours is allowed if it holds every letter on the list. "${text.slice(0, loose + 1)}" does. Extra letters in between are fine.`,
    state: { ...blank(chars, need), tones: tones(chars.length, range(0, loose, "hit")), list: listFor(chars, need, 0, loose), counting: true },
  });
  if (to > from) {
    const short = listFor(chars, need, from + 1, to, chars[from], "miss");
    const gone = firstMissing(short);
    if (gone) {
      frames.push({
        scene: "picture",
        caption: `"${text.slice(from + 1, to + 1)}" is not allowed. The list needs ${gone.need} ${gone.letter} and this run has ${gone.have}.`,
        state: { ...blank(chars, need), tones: tones(chars.length, range(from + 1, to, "miss")), list: short, counting: true },
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: `The goal: find the shortest allowed run. Here it is "${text.slice(from, to + 1)}", with length ${to - from + 1}.`,
    state: { ...blank(chars, need), tones: tones(chars.length, range(from, to, "done")), list: listFor(chars, need, from, to), counting: true, best: solved.best },
  });
  return frames;
}

/** The obvious way, really run: from every start, read to the right until the list is complete. */
function slowFrames(chars: string[], need: Map<string, number>, solved: Solved): F[] {
  const frames: F[] = [];
  const text = chars.join("");
  let read = 0;
  let best: [number, number] | null = null;
  for (let start = 0; start < chars.length; start++) {
    const counts = new Map<string, number>();
    let have = 0;
    let end = start;
    let found = false;
    for (; end < chars.length; end++) {
      read++;
      const c = chars[end];
      counts.set(c, (counts.get(c) ?? 0) + 1);
      if (need.has(c) && counts.get(c) === need.get(c)) have++;
      if (have === need.size) {
        found = true;
        break;
      }
    }
    const stop = found ? end : chars.length - 1;
    if (found && (!best || stop - start < best[1] - best[0])) best = [start, stop];
    if (start > 2) continue;
    const result = found ? `It finds "${text.slice(start, stop + 1)}".` : "It reaches the end with letters still missing.";
    frames.push({
      scene: "slow",
      caption:
        start === 0
          ? `The slow way: start at the first letter and read to the right until the list is complete. ${result}`
          : `Now go back, start one letter later, and read the same letters all over again. ${result}`,
      state: {
        ...blank(chars, need),
        left: start,
        right: stop,
        tones: tones(chars.length, (index) => (index < start ? "faded" : range(start, stop, found ? "hit" : "miss")(index))),
        list: listFor(chars, need, start, stop),
        counting: true,
        best,
        counter: { label: "letters read", value: read },
      },
    });
  }
  const winner = solved.best ? `It does find "${text.slice(solved.best[0], solved.best[1] + 1)}"` : "It finds no allowed run";
  frames.push({
    scene: "slow",
    caption: `${winner}, but it read ${read} letters for a string of ${chars.length}. This is O(n²) time: every start reads the same letters again.`,
    state: { ...blank(chars, need), tones: tones(chars.length, (index) => (best ? range(best[0], best[1], "done")(index) : null) ?? "faded"), best, counter: { label: "letters read", value: read } },
  });
  return frames;
}

function insightFrames(chars: string[], need: Map<string, number>, solved: Solved): F[] {
  const right = solved.firstComplete;
  if (right === null) return [{ scene: "insight", caption: "Picture a shopper with a list. The basket grows to the right until every letter on the list is ticked. Here that never happens.", state: { ...blank(chars, need), counting: true } }];
  const text = chars.join("");
  // Drop from the left, for real, until a letter goes missing.
  let left = 0;
  while (left < right && !firstMissing(listFor(chars, need, left + 1, right))) left++;
  const dropped = chars[left];
  const kept = left > 0 ? ` It drops ${quoted(chars.slice(0, left))} and the list stays complete.` : "";
  return [
    {
      scene: "insight",
      caption: `Picture a shopper with a list. The basket "${text.slice(0, right + 1)}" just took in '${chars[right]}', and now every letter on the list is ticked.`,
      state: { ...blank(chars, need), left: 0, right, tones: tones(chars.length, (index) => (index === right ? "edge" : range(0, right, "window")(index))), list: listFor(chars, need, 0, right, chars[right]), counting: true },
    },
    {
      scene: "insight",
      caption: `A complete basket can only get better by getting shorter. So the left edge drops letters, one at a time, while the list stays complete.${kept}`,
      state: { ...blank(chars, need), left, right, tones: tones(chars.length, (index) => (index < left ? "faded" : index === left ? "edge" : range(left, right, "window")(index))), list: listFor(chars, need, left, right), counting: true },
    },
    {
      scene: "insight",
      caption: `Dropping '${dropped}' leaves ${dropped} missing, so the left edge stops. The right edge goes shopping again. Neither edge ever moves back.`,
      state: { ...blank(chars, need), left: left + 1, right, tones: tones(chars.length, (index) => (index <= left ? "faded" : range(left + 1, right, "window")(index))), list: listFor(chars, need, left + 1, right, dropped, "miss"), counting: true },
    },
  ];
}

/**
 * The real algorithm. Stretches where nothing on the list changes are told in one frame.
 * `practice` reuses it on a fresh input, and the reader decides for the left edge every time.
 */
function solutionFrames(s: string, t: string, scene: SceneId = "solution", practice = false): F[] {
  const chars = [...s];
  const n = chars.length;
  const need = needOf(t);
  const letters = [...need.keys()];
  const basket = new Map<string, number>();
  const frames: F[] = [];
  let have = 0;
  let left = 0;
  let best: [number, number] | null = null;
  let steps = 0;
  const asked = { edge: false, missing: false, spare: false };
  const line = (index: number) => (practice ? undefined : index);
  const count = (letter: string) => basket.get(letter) ?? 0;
  const bestLen = () => (best ? best[1] - best[0] + 1 : Infinity);

  const rows = (focus?: string, tone: ChecklistRow["tone"] = "hit"): ChecklistRow[] =>
    letters.map((letter) => ({ letter, need: need.get(letter) ?? 0, have: count(letter), tone: letter === focus ? tone : "idle" }));
  const paint = (right: number, inner: (index: number) => CellTone | null) => tones(n, (index) => (index < left ? "faded" : (inner(index) ?? range(left, right, "window")(index))));
  const base = (right: number): ChecklistWindowState => ({ chars, tones: paint(right, () => null), left, right: right < 0 ? null : right, list: rows(), counting: true, best });

  const edgeQuiz = (right: number, complete: boolean): StoryQuiz => ({
    kind: "cell",
    cells: n,
    question: `${complete ? "The list is complete." : "A letter is missing."} Which edge moves now? Click the letter under that edge.`,
    answer: complete ? left : right,
    feedback:
      left === right
        ? {}
        : complete
          ? { [right]: "The right edge goes shopping only while something is missing. Look at the list: is anything missing?" }
          : { [left]: "The left edge drops letters only while the list is complete. Look at the list: is it complete?" },
    otherwise: "Only the two edges can move. Choose the letter under one of them.",
    why: complete ? "The left edge. The basket is complete, so now it tries to get shorter." : "The right edge. Something is missing, so the basket must grow to find it.",
  });

  const dropQuiz = (letter: string, spare: boolean): StoryQuiz => {
    const own = letters.indexOf(letter);
    const feedback: Record<number, string> = {};
    letters.forEach((other, index) => {
      if (index !== own) feedback[index] = `The left edge is dropping '${letter}', not '${other}'. Only the count of ${letter} changes.`;
    });
    if (spare) feedback[own] = `Compare the two numbers for ${letter}. The basket has ${count(letter)} and the list needs ${need.get(letter)}.`;
    else feedback[letters.length] = `Compare the two numbers for ${letter}. Is there a spare one in the basket?`;
    return {
      kind: "cell",
      cells: letters.length + 1,
      question: `The left edge is about to drop '${letter}'. Which letter on the list goes missing? Click it, or click “nothing”.`,
      answer: spare ? letters.length : own,
      feedback,
      otherwise: "Look at the have and need numbers of the letter being dropped.",
      why: spare ? `Nothing. The basket has a spare ${letter}, so the list stays complete.` : `${letter}. The basket had exactly as many as the list needs, so losing one hurts.`,
    };
  };

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new string: "${s}". The list says ${[...t].join(", ")}. The right edge moves by itself, and you decide for the left edge.`
      : `The shopper starts with an empty basket before the first letter. Nothing on the list is ticked yet.`,
    codeLine: line(3),
    state: { ...base(-1), left: 0 },
  });

  // Letters the right edge walked over without changing a tick, waiting to be told in one frame.
  let quiet: string[] = [];
  const flushQuiet = (right: number) => {
    if (quiet.length === 0) return;
    const many = quiet.length > 1;
    frames.push({
      scene,
      caption: practice
        ? `The right edge walks on and takes ${quoted(quiet)} into the basket. The list shows what is ticked so far.`
        : `The right edge passes ${quoted(quiet)}. ${many ? "They are" : "It is"} not on the list, so ${many ? "they just ride" : "it just rides"} along in the basket.`,
      codeLine: line(6),
      state: { ...base(right), tones: paint(right, range(right - quiet.length + 1, right, "edge")) },
    });
    quiet = [];
  };

  for (let right = 0; right < n; right++) {
    const c = chars[right];
    const needed = need.get(c);
    const ticks = needed !== undefined && count(c) + 1 === needed;
    const complete = ticks && have + 1 === need.size;
    const told = needed !== undefined && (!practice || complete);
    // Tell the quiet stretch before the basket changes, so its picture shows that moment.
    if (told) flushQuiet(right - 1);
    steps++;
    basket.set(c, count(c) + 1);
    if (ticks) have++;
    if (needed === undefined || !told) {
      quiet.push(c);
      if (right === n - 1) flushQuiet(right);
      continue;
    }

    const now = count(c);
    frames.push({
      scene,
      caption: complete
        ? `The right edge picks up '${c}': tick. Now every letter on the list is ticked, so the basket is complete.`
        : ticks
          ? `The right edge picks up '${c}'. The list needs ${needed} and the basket has ${now}: tick.`
          : now < needed
            ? `The right edge picks up '${c}'. The list needs ${needed} and the basket has only ${now}, so no tick yet.`
            : `The right edge picks up another '${c}'. The list needs ${needed} and the basket has ${now}, so one is a spare.`,
      codeLine: line(7),
      state: { ...base(right), tones: paint(right, (index) => (index === right ? "edge" : null)), list: rows(c) },
    });

    let firstMove = true;
    // Ask "which edge?" on the last frame before the left edge starts to move.
    const askEdge = () => {
      const wanted = firstMove && (practice || !asked.edge);
      firstMove = false;
      const last = frames[frames.length - 1];
      if (!wanted || last.quiz) return;
      asked.edge = true;
      last.quiz = edgeQuiz(right, true);
      last.state = { ...last.state, ask: "edge" };
    };

    while (have === need.size && need.size > 0) {
      // Letters that are not on the list can always go.
      const fillers: string[] = [];
      while (!need.has(chars[left])) {
        fillers.push(chars[left]);
        basket.set(chars[left], count(chars[left]) - 1);
        left++;
        steps++;
      }
      if (fillers.length > 0) {
        askEdge();
        frames.push({
          scene,
          caption: `The left edge drops ${quoted(fillers)}. ${fillers.length > 1 ? "They are" : "It is"} not on the list, so the list stays complete and the basket is shorter.`,
          codeLine: line(16),
          state: base(right),
        });
      }

      const d = chars[left];
      const spare = count(d) > (need.get(d) ?? 0);
      const length = right - left + 1;
      const word = s.slice(left, right + 1);
      if (length < bestLen()) {
        const old = best ? `That beats the old best, ${bestLen()}.` : "It is the first one we found.";
        best = [left, right];
        frames.push({ scene, caption: `The complete basket "${word}" is a candidate, with length ${length}. ${old} New best: ${length}.`, codeLine: line(10), state: { ...base(right), tones: paint(right, range(left, right, "done")) } });
      } else if (!spare && !practice) {
        frames.push({ scene, caption: `The basket "${word}" is complete, with length ${length}. That is not shorter than the best, ${bestLen()}, so the best stays.`, codeLine: line(9), state: base(right) });
      }

      // Now the real decision: the left letter is on the list.
      askEdge();
      const kind = spare ? "spare" : "missing";
      const ask = practice || !asked[kind];
      if (ask) {
        asked[kind] = true;
        frames.push({
          scene,
          caption: `The left edge wants a shorter basket. It is about to drop '${d}'. Look at the list before it goes.`,
          codeLine: line(13),
          state: { ...base(right), tones: paint(right, (index) => (index === left ? "edge" : null)), ask: "list" },
          quiz: dropQuiz(d, spare),
        });
      }
      basket.set(d, count(d) - 1);
      left++;
      steps++;
      if (spare) {
        const trapRow = letters.indexOf(d);
        frames.push({
          scene,
          caption: `The Spare Copy Trap. The basket held ${count(d) + 1} ${d} and the list needs only ${need.get(d)}, so ${d} stays ticked. Untick it, and the left edge stops too early.`,
          codeLine: line(15),
          state: { ...base(right), list: rows(d), trapRow },
        });
        continue;
      }
      have--;
      const end = right === n - 1;
      const missing: F = {
        scene,
        caption: `${ask ? `'${d}' is dropped.` : `The left edge drops '${d}'.`} The list needs ${need.get(d)} ${d} and the basket now has ${count(d)}, so ${d} is missing. The left edge stops.`,
        codeLine: line(15),
        state: { ...base(right), list: rows(d, "miss") },
      };
      if (practice && !end) {
        missing.quiz = edgeQuiz(right, false);
        missing.state = { ...missing.state, ask: "edge" };
      }
      frames.push(missing);
    }
  }

  const result = best ? s.slice(best[0], best[1] + 1) : "";
  const done = (index: number) => (best ? range(best[0], best[1], "done")(index) : null);
  const finalState: ChecklistWindowState = { chars, tones: tones(n, done), left: best ? best[0] : null, right: best ? best[1] : null, list: best ? listFor(chars, need, best[0], best[1]) : rows(), counting: true, best };
  frames.push({
    scene,
    caption: practice
      ? `Done. The answer is "${result}". You decided every move of the left edge yourself.`
      : best
        ? `The right edge reached the end, so the basket cannot be completed again. The answer is "${result}".`
        : `The right edge reached the end and the list was never complete. No basket works, so the answer is "${result}".`,
    codeLine: line(19),
    state: finalState,
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n + m). The two edges took ${steps} steps in all, because each one only walks forward over the ${n} letters. Writing the list reads the ${t.length} needed letters once.`,
      codeLine: 4,
      state: { ...finalState, counter: { label: "edge steps", value: steps } },
    });
    frames.push({
      scene,
      caption: `Space: O(k), where k is the number of different letters. The list and the basket each keep one count per letter, never the letters themselves.`,
      codeLine: 0,
      state: { ...finalState, list: finalState.list.map((row) => ({ ...row, tone: "hit" as const })) },
    });
  }
  return frames;
}

export const minimumWindowSubstringStory: ProblemStory<ChecklistWindowState> = {
  slugs: ["lc-76"],
  pattern: "Sliding window with need counts",
  trigger: "“shortest substring that contains all the letters of another string”",
  insight: "A shopper with a list. The right edge fills the basket until every letter is ticked, then the left edge drops letters while the list stays complete.",
  metaphor: {
    name: "The Grocery Checklist",
    legend: "basket = the window · list = need · ticked = basket count reached need · left edge = left · right edge = right",
    terms: ["basket", "list", "left edge", "right edge", "tick", "shopper"],
  },
  traps: [{ name: "The Spare Copy Trap", rule: "Dropping a needed letter only unticks it when the basket falls below the need. A spare copy keeps the list complete: check basket.get(d) < need.get(d)." }],
  template: [
    "count what the list needs;",
    "for (right = 0; right < n; right++) {",
    "    add s[right] to the basket; tick if its count just reached the need;",
    "    while (list is complete) {",
    "        best = shorter of best and this basket;",
    "        drop s[left]; untick only if its count fell below the need; left++;",
    "    }",
    "}",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n + m)",
    timeWhy: "each edge walks forward over the string once, plus one pass over t to write the list",
    space: "O(k)",
    spaceWhy: "one count per different letter, for the list and for the basket",
  },
  code: CODE,
  examples: [
    { label: 's="ADOBECODEBANC", t="ABC"', input: 's="ADOBECODEBANC", t="ABC"', expected: '"BANC"' },
    { label: 's="BACAAB", t="AAB"', input: 's="BACAAB", t="AAB"', expected: '"AAB"', note: "Tricky: the list needs a letter twice" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-3", title: "Longest Substring Without Repeating Characters" },
    { slug: "lc-438", title: "Find All Anagrams in a String" },
    { slug: "lc-567", title: "Permutation in String" },
    { slug: "lc-209", title: "Minimum Size Subarray Sum" },
  ],
  answer: (input) => {
    const { s, t } = parse(input);
    const { best } = solve(s, t);
    return `"${best ? s.slice(best[0], best[1] + 1) : ""}"`;
  },
  frames: (input) => {
    const { s, t } = parse(input);
    const chars = [...s];
    const need = needOf(t);
    const solved = solve(s, t);
    const practice = parse(PRACTICE);
    const finalList = solved.best ? listFor(chars, need, solved.best[0], solved.best[1]) : listFor(chars, need, 0, -1);
    return [
      ...pictureFrames(chars, t, need, solved),
      ...slowFrames(chars, need, solved),
      ...insightFrames(chars, need, solved),
      ...solutionFrames(s, t),
      ...solutionFrames(practice.s, practice.t, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: {
          ...blank(chars, need),
          left: solved.best ? solved.best[0] : null,
          right: solved.best ? solved.best[1] : null,
          tones: tones(chars.length, (index) => (solved.best ? range(solved.best[0], solved.best[1], "done")(index) : null)),
          list: finalList,
          counting: true,
          best: solved.best,
        },
      },
    ];
  },
  View: ChecklistWindowView,
};
