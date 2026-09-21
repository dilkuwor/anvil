import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp3CentresView, type CentresState } from "../agy-dp3-centres-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<CentresState>;

/** Fresh string for the "your turn" run. Its two biggest palindromes have their middle in a gap. */
const PRACTICE = "noon";

const CODE = [
  "int total = 0;",
  "for (int center = 0; center < s.length(); center++) {",
  "    total += count(s, center, center);      // pebble on a letter",
  "    total += count(s, center, center + 1);  // pebble in the gap after it",
  "}",
  "return total;",
  "",
  "int count(String s, int left, int right) {",
  "    int found = 0;",
  "    while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {",
  "        found++;",
  "        left--; right++;",
  "    }",
  "    return found;",
  "}",
];

function parseInput(raw: string): string[] {
  const letters = [...raw.replace(/^s\s*=\s*/, "").replace(/["'\s]/g, "")].slice(0, 8);
  return letters.length > 0 ? letters : [..."abba"];
}

/** Independent solver: take every run of neighbours and compare it with itself written backwards. */
function countPalindromes(chars: string[]): number {
  let total = 0;
  for (let start = 0; start < chars.length; start++) {
    for (let end = start; end < chars.length; end++) {
      const run = chars.slice(start, end + 1);
      if (run.join("") === [...run].reverse().join("")) total++;
    }
  }
  return total;
}

function tones(count: number, paint: (index: number) => CellTone | null = () => null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

const range = (from: number, to: number, tone: CellTone) => (index: number) => (index >= from && index <= to ? tone : null);

function blank(chars: string[]): CentresState {
  return { chars, tones: tones(chars.length), centre: null, ripple: null, reach: null, found: null, fresh: 0, total: null, counter: null, badge: null, note: null };
}

/** One pebble: where it dropped, and every palindrome its ripple found, smallest first. */
type Drop = { centre: number; isGap: boolean; grown: [number, number][]; stop: { left: number; right: number; verdict: "differ" | "wall" } };

/** The real algorithm: a pebble on every letter and in the gap after it, each ripple grown as far as it goes. */
function dropAll(chars: string[]): { drops: Drop[]; pairs: number } {
  const drops: Drop[] = [];
  let pairs = 0;
  for (let center = 0; center < chars.length; center++) {
    for (const isGap of [false, true]) {
      let left = center;
      let right = isGap ? center + 1 : center;
      const grown: [number, number][] = [];
      while (left >= 0 && right < chars.length) {
        pairs++;
        if (chars[left] !== chars[right]) break;
        grown.push([left, right]);
        left--;
        right++;
      }
      const wall = left < 0 || right >= chars.length;
      drops.push({ centre: 2 * center + (isGap ? 1 : 0), isGap, grown, stop: { left, right, verdict: wall ? "wall" : "differ" } });
    }
  }
  return { drops, pairs };
}

const text = (chars: string[], [left, right]: [number, number]) => chars.slice(left, right + 1).join("");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function pictureFrames(chars: string[], drops: Drop[], total: number): Frame[] {
  const word = chars.join("");
  const frames: Frame[] = [{ scene: "picture", caption: `This is the string "${word}". Each box is one letter, with its index below.`, state: blank(chars) }];
  const all = drops.flatMap((drop) => drop.grown);
  const long = [...all].sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  if (long && long[1] > long[0]) {
    frames.push({
      scene: "picture",
      caption: `"${text(chars, long)}" reads the same from left to right and from right to left. A run of neighbours like that is called a palindrome.`,
      state: { ...blank(chars), tones: tones(chars.length, range(long[0], long[1], "done")), note: { text: "same in both directions: a palindrome", tone: "teal" } },
    });
  }
  // The first pair of neighbours that does not read the same both ways.
  const bad = chars.findIndex((letter, index) => index + 1 < chars.length && chars[index + 1] !== letter);
  if (bad !== -1) {
    frames.push({
      scene: "picture",
      caption: `"${chars[bad]}${chars[bad + 1]}" is not a palindrome. Read backwards it says "${chars[bad + 1]}${chars[bad]}".`,
      state: { ...blank(chars), tones: tones(chars.length, range(bad, bad + 1, "miss")), note: { text: `✕ backwards it reads "${chars[bad + 1]}${chars[bad]}"`, tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption: "A single letter counts as a palindrome too. And the same letters at a different place count again.",
    state: { ...blank(chars), tones: tones(chars.length, () => "hit"), found: chars.map((letter) => letter), fresh: 0 },
  });
  frames.push({
    scene: "picture",
    caption: `The goal: count every palindrome in the string. Here there are ${total}.`,
    state: { ...blank(chars), found: [...all].sort((a, b) => a[1] - a[0] - (b[1] - b[0]) || a[0] - b[0]).map((run) => text(chars, run)), fresh: 0, total },
  });
  return frames;
}

type SlowCheck = { start: number; end: number; ok: boolean; pairsSoFar: number; runsSoFar: number };

/** Really checks every run of neighbours from both ends inwards, counting each pair of letters it compares. */
function runSlow(chars: string[]): { checks: SlowCheck[]; pairs: number } {
  const checks: SlowCheck[] = [];
  let pairs = 0;
  for (let start = 0; start < chars.length; start++) {
    for (let end = start; end < chars.length; end++) {
      let left = start;
      let right = end;
      let ok = true;
      while (left < right) {
        pairs++;
        if (chars[left++] !== chars[right--]) {
          ok = false;
          break;
        }
      }
      checks.push({ start, end, ok, pairsSoFar: pairs, runsSoFar: checks.length + 1 });
    }
  }
  return { checks, pairs };
}

function slowFrames(chars: string[], slow: { checks: SlowCheck[]; pairs: number }): Frame[] {
  const frames: Frame[] = [];
  const n = chars.length;
  const shown = slow.checks.filter((check) => check.end > check.start).slice(0, 2);
  shown.forEach((check, index) => {
    const run = text(chars, [check.start, check.end]);
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: take every run of neighbours, one at a time, and check it from both ends inwards. "${run}" ${check.ok ? "is a palindrome" : "is not"}.`
          : `Next run: "${run}". It shares its letters with the run before, but the check starts from nothing again. ${check.ok ? "It is a palindrome." : "It is not."}`,
      state: { ...blank(chars), tones: tones(n, range(check.start, check.end, check.ok ? "hit" : "miss")), counter: { label: "runs checked", value: check.runsSoFar } },
    });
  });
  frames.push({
    scene: "slow",
    caption: `All ${slow.checks.length} runs checked, for only ${plural(n, "letter")}. With 1,000 letters there are about 500,000 runs, each up to 1,000 letters long. This is O(n³) time.`,
    state: { ...blank(chars), tones: tones(n, () => "faded"), counter: { label: "runs checked", value: slow.checks.length } },
  });
  return frames;
}

function insightFrames(chars: string[], drops: Drop[]): Frame[] {
  const n = chars.length;
  const grower = drops.find((drop) => drop.grown.length >= (drop.isGap ? 1 : 2)) ?? null;
  if (!grower) {
    return [
      {
        scene: "insight",
        caption: "Every palindrome has a middle. Picture dropping a pebble on a middle: a ripple grows outwards from it, one letter on each side at a time.",
        state: { ...blank(chars), centre: 0, ripple: { left: 0, right: 0, tone: "accent" } },
      },
      {
        scene: "insight",
        caption: "The ripple may grow only while the two letters it reaches are the same. In this string no two such letters match, so every ripple stays one letter wide.",
        state: { ...blank(chars), centre: n > 2 ? 2 : 0, ripple: n > 2 ? { left: 1, right: 1, tone: "accent" } : { left: 0, right: 0, tone: "accent" }, reach: n > 2 ? { left: 0, right: 2, verdict: "differ" } : null },
      },
    ];
  }
  const first = grower.isGap ? grower.grown[0] : grower.grown[1];
  const last = grower.grown.at(-1)!;
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: `Every palindrome has a middle. Picture dropping a pebble there${grower.isGap ? ", here in a gap between two letters" : ""}. A ripple grows outwards from it, one letter on each side at a time.`,
      state: { ...blank(chars), centre: grower.centre, ripple: grower.isGap ? null : { left: grower.grown[0][0], right: grower.grown[0][1], tone: "accent" } },
    },
    {
      scene: "insight",
      caption: `The ripple may grow only while the two letters it reaches are the same. Here '${chars[first[0]]}' and '${chars[first[1]]}' match, so "${text(chars, first)}" is a palindrome.`,
      state: { ...blank(chars), centre: grower.centre, ripple: { left: first[0], right: first[1], tone: "teal" }, reach: { left: first[0], right: first[1], verdict: "same" } },
    },
    {
      scene: "insight",
      caption: `One pebble finds several palindromes without starting over. Each time its ripple grows, that is one more. This one found ${grower.grown.map((run) => `"${text(chars, run)}"`).join(", ")}.`,
      state: { ...blank(chars), centre: grower.centre, ripple: { left: last[0], right: last[1], tone: "teal" }, reach: grower.stop, found: grower.grown.map((run) => text(chars, run)), fresh: 0 },
    },
  ];
  return frames;
}

/** Where the next pebble drops after a letter: in the gap right after it, not on the next letter. */
function nextMiddleQuiz(chars: string[], letter: number): StoryQuiz {
  const n = chars.length;
  return {
    kind: "cell",
    cells: 2 * n - 1,
    question: "Where does the next pebble drop? Click a letter, or the dot in a gap between two letters.",
    answer: n + letter,
    feedback: {
      [letter]: "That middle is finished. The pebble moves on to the right.",
      [letter + 1]: "Not yet. Jumping to the next letter skips a middle, and every palindrome with an even number of letters would be missed.",
    },
    otherwise: "Too far. The pebble moves to the right by the smallest step there is.",
    why: `A palindrome with an even number of letters has its middle between two letters. So the gap after '${chars[letter]}' gets a pebble too. Skipping the gaps is the Gap Trap.`,
  };
}

/** After a gap, the pebble drops on the very next letter. */
function nextLetterQuiz(chars: string[], gap: number): StoryQuiz {
  const n = chars.length;
  return {
    kind: "cell",
    cells: 2 * n - 1,
    question: "This gap is finished. Where does the next pebble drop? Click a letter, or the dot in a gap.",
    answer: gap + 1,
    feedback: {
      [n + gap]: "That gap is finished. The pebble moves on to the right.",
      [gap]: "That letter had its pebble already. The pebble never moves back.",
      ...(gap + 1 < n - 1 ? { [n + gap + 1]: "That skips a letter. Every letter is a middle too." } : {}),
    },
    otherwise: "The pebble moves to the right by the smallest step there is.",
    why: "Letter, gap, letter, gap: every possible middle gets exactly one pebble, from left to right.",
  };
}

/** The left letter the ripple would reach is lit. The reader points at its partner on the right. */
function partnerQuiz(chars: string[], ripple: [number, number]): StoryQuiz {
  const n = chars.length;
  const feedback: Record<number, string> = { [ripple[0] - 1]: "That is the letter on the left. Its partner is on the other side of the ripple." };
  for (let index = ripple[0]; index <= ripple[1]; index++) feedback[index] = "That letter is already inside the ripple. The ripple grows outwards.";
  return {
    kind: "cell",
    cells: 2 * n - 1,
    question: `On the left, the ripple would reach the '${chars[ripple[0] - 1]}' that is lit. Which letter must it reach on the right? Click it.`,
    answer: ripple[1] + 1,
    feedback,
    otherwise: "The ripple grows by exactly one letter on each side. Look just outside its right edge.",
    why: "A ripple grows evenly: one letter on the left, one on the right. Only if those two are the same does the bigger run still read the same both ways.",
  };
}

function growQuiz(question: string, grows: boolean, why: string): StoryQuiz {
  return { kind: "choice", question, options: ["Yes, it grows", "No, it stops"], answer: grows ? 0 : 1, why };
}

/**
 * The real algorithm, one pebble after the other. The first drop, the first growth and the first stop of each kind are told in full;
 * after that a pebble whose ripple never grows is told in one frame. `practice` reuses it on a fresh string, where the reader decides.
 */
function solutionFrames(chars: string[], drops: Drop[], scene: SceneId, practice: boolean): Frame[] {
  const n = chars.length;
  const frames: Frame[] = [];
  const found: string[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const onLetters = drops.filter((drop) => !drop.isGap).reduce((sum, drop) => sum + drop.grown.length, 0);
  const everything = drops.reduce((sum, drop) => sum + drop.grown.length, 0);
  const base = (fresh = 0): CentresState => ({ ...blank(chars), found: [...found], fresh, total: found.length });
  const seenStop = new Set<string>();
  let askedGap = false;
  let askedLetter = false;
  let askedPartner = false;
  let trapShown = false;
  let toldSingle = false;

  frames.push(
    practice
      ? { scene, caption: `Your turn, on a new string: "${chars.join("")}". You decide where each pebble drops, and whether its ripple grows.`, state: base() }
      : { scene, caption: "Nothing found yet. A pebble will drop on every possible middle in turn, from left to right.", codeLine: 0, state: base() },
  );

  drops.forEach((drop, order) => {
    const letter = Math.floor(drop.centre / 2);
    const where = drop.isGap ? (letter + 1 < n ? `in the gap between '${chars[letter]}' and '${chars[letter + 1]}'` : "after the last letter") : `on '${chars[letter]}' at index ${letter}`;
    const dropLine = line(drop.isGap ? 3 : 2);
    const stopKey = `${drop.isGap ? "gap" : "letter"}-${drop.stop.verdict}`;

    // After the last letter there is no gap: the code still looks, and finds the wall.
    if (drop.isGap && letter + 1 >= n) {
      frames.push({
        scene,
        caption: "After the last letter there is no gap, only the wall. Nothing can be found there.",
        codeLine: dropLine,
        state: { ...base(), centre: drop.centre, reach: drop.stop, tones: tones(n) },
      });
      return;
    }

    const dead = drop.grown.length === (drop.isGap ? 0 : 1);
    const stopText =
      drop.stop.verdict === "wall"
        ? `it hits the wall on the ${drop.stop.left < 0 ? "left" : "right"}`
        : drop.isGap && drop.grown.length === 0
          ? `'${chars[drop.stop.left]}' and '${chars[drop.stop.right]}' differ`
          : `it reaches '${chars[drop.stop.left]}' and '${chars[drop.stop.right]}', which differ`;

    // A pebble whose ripple never grows, of a kind already seen: one frame (in practice the reader still predicts it).
    if (dead && seenStop.has(stopKey) && toldSingle && !practice) {
      if (!drop.isGap) found.push(chars[letter]);
      frames.push({
        scene,
        caption: drop.isGap
          ? `The pebble drops ${where}. ${stopText[0].toUpperCase()}${stopText.slice(1)}, so no ripple starts.`
          : `The pebble drops ${where}: 1 more found. The ripple cannot grow: ${stopText}.`,
        codeLine: dropLine,
        state: { ...base(drop.isGap ? 0 : 1), centre: drop.centre, ripple: drop.isGap ? null : { left: letter, right: letter, tone: "teal" }, reach: drop.stop },
      });
      return;
    }
    seenStop.add(stopKey);

    // The drop itself.
    let ripple: [number, number] | null = null;
    if (!drop.isGap) {
      if (!toldSingle && !practice) {
        frames.push({ scene, caption: `The pebble drops ${where}.`, codeLine: dropLine, state: { ...base(), centre: drop.centre } });
      }
      found.push(chars[letter]);
      ripple = [letter, letter];
      frames.push({
        scene,
        caption: toldSingle || practice ? `The pebble drops ${where}. One letter alone is a palindrome: 1 more found.` : `One letter alone reads the same both ways, so "${chars[letter]}" is a palindrome. That is 1 found.`,
        codeLine: line(10),
        state: { ...base(1), centre: drop.centre, ripple: { left: letter, right: letter, tone: "teal" } },
      });
      toldSingle = true;
    } else {
      frames.push({
        scene,
        caption: `The pebble drops ${where}. A gap holds no letter, so nothing is found yet.`,
        codeLine: dropLine,
        state: { ...base(), centre: drop.centre },
      });
    }

    // Each try to grow: first the ones that work, then the one that stops the ripple.
    const tries: { left: number; right: number; grows: boolean }[] = [
      ...drop.grown.slice(drop.isGap ? 0 : 1).map(([left, right]) => ({ left, right, grows: true })),
      { left: drop.stop.left, right: drop.stop.right, grows: false },
    ];
    for (const attempt of tries) {
      const inside = attempt.left >= 0 && attempt.right < n;
      const current = ripple;
      const rippleState = current ? { left: current[0], right: current[1], tone: "teal" as const } : null;
      const last = frames.at(-1)!;
      if (inside && current && !drop.isGap && (practice ? !askedPartner : !askedPartner)) {
        askedPartner = true;
        frames.push({
          scene,
          caption: `The ripple "${text(chars, current)}" wants to grow by one letter on each side.`,
          codeLine: line(9),
          state: { ...base(), centre: drop.centre, ripple: rippleState, tones: tones(n, (index) => (index === attempt.left ? "edge" : null)) },
          quiz: partnerQuiz(chars, current),
        });
      } else if (practice && inside && !last.quiz) {
        last.quiz = growQuiz(
          current ? `The ripple is "${text(chars, current)}". Does it grow?` : "Does a ripple start from this gap?",
          attempt.grows,
          attempt.grows ? `'${chars[attempt.left]}' and '${chars[attempt.right]}' are the same letter, so the run between them still reads the same both ways.` : `'${chars[attempt.left]}' and '${chars[attempt.right]}' differ, so a bigger run would not read the same both ways.`,
        );
      }

      if (attempt.grows) {
        ripple = [attempt.left, attempt.right];
        found.push(text(chars, ripple));
        frames.push({
          scene,
          caption: current
            ? `The ripple reaches '${chars[attempt.left]}' on the left and '${chars[attempt.right]}' on the right. They are the same, so it grows: "${text(chars, ripple)}" is a palindrome. 1 more found.`
            : `On the two sides of the gap are '${chars[attempt.left]}' and '${chars[attempt.right]}'. They are the same, so a ripple starts: "${text(chars, ripple)}" is a palindrome. 1 more found.`,
          codeLine: line(10),
          state: { ...base(1), centre: drop.centre, ripple: { left: ripple[0], right: ripple[1], tone: "teal" }, reach: { left: attempt.left, right: attempt.right, verdict: "same" } },
        });
        if (drop.isGap && !trapShown && !practice) {
          trapShown = true;
          frames.push({
            scene,
            caption: `The Gap Trap: pebbles dropped only on letters would never find "${text(chars, ripple)}". Its middle is a gap. The count would come out as ${onLetters} instead of ${everything}.`,
            codeLine: 3,
            state: { ...base(), centre: drop.centre, ripple: { left: ripple[0], right: ripple[1], tone: "coral" }, note: { text: `✕ pebbles on letters only: ${onLetters} found, not ${everything}`, tone: "coral" }, badge: { text: "the Gap Trap", tone: "coral" } },
          });
        }
      } else {
        frames.push({
          scene,
          caption:
            attempt.left < 0 || attempt.right >= n
              ? `The ripple wants to grow again, but it hits the wall on the ${attempt.left < 0 ? "left" : "right"}. It stops.`
              : current
                ? `To grow, the ripple must reach '${chars[attempt.left]}' on the left and '${chars[attempt.right]}' on the right. They differ, so it stops.`
                : `A ripple can start only if '${chars[attempt.left]}' and '${chars[attempt.right]}' are the same. They differ, so no ripple starts.`,
          codeLine: line(9),
          state: { ...base(), centre: drop.centre, ripple: rippleState, reach: drop.stop },
        });
      }
    }

    // Where next? Asked the first time after a letter (the trap) and the first time after a gap.
    const next = drops[order + 1];
    const end = frames.at(-1)!;
    if (next && !end.quiz) {
      if (!drop.isGap && !askedGap && letter + 1 < n) {
        askedGap = true;
        end.quiz = nextMiddleQuiz(chars, letter);
      } else if (drop.isGap && !askedLetter) {
        askedLetter = true;
        end.quiz = nextLetterQuiz(chars, letter);
      }
    }
  });
  return frames;
}

function remembered(chars: string[], drops: Drop[]): CentresState {
  // The pebble whose ripple grew the most; a gap wins a tie, because that is the one people forget.
  const best = [...drops].sort((a, b) => b.grown.length - a.grown.length || Number(b.isGap) - Number(a.isGap))[0];
  const all = drops.flatMap((drop) => drop.grown);
  const widest = best.grown.at(-1);
  return {
    ...blank(chars),
    centre: best.centre,
    ripple: widest ? { left: widest[0], right: widest[1], tone: "teal" } : null,
    reach: best.stop,
    found: best.grown.map((run) => text(chars, run)),
    fresh: 0,
    total: all.length,
  };
}

function endFrames(chars: string[], drops: Drop[], pairs: number): Frame[] {
  const n = chars.length;
  const all = drops.flatMap((drop) => drop.grown).map((run) => text(chars, run));
  const done: CentresState = { ...blank(chars), found: all, fresh: 0, total: all.length };
  return [
    { scene: "solution", caption: `Every middle has had its pebble. ${plural(all.length, "palindrome")} found. The answer is ${all.length}.`, codeLine: 5, state: { ...done, tones: tones(n, () => "done") } },
    {
      scene: "solution",
      caption: `Time: O(n²). There are about 2 × n middles, here ${2 * n - 1}, and a ripple can grow at most n letters wide. Here the ripples compared ${plural(pairs, "pair")} of letters in all.`,
      codeLine: 9,
      state: { ...done, counter: { label: "pairs of letters compared", value: pairs } },
    },
    {
      scene: "solution",
      caption: "Space: O(1). Nothing is stored about the string: only the count found so far, and the two edges of the ripple.",
      codeLine: 0,
      state: { ...remembered(chars, drops), badge: { text: "only a count and two edges", tone: "accent" } },
    },
  ];
}

export const palindromicSubstringsStory: ProblemStory<CentresState> = {
  slugs: ["lc-647"],
  pattern: "Center expansion",
  trigger: "count (or find) the palindromes inside a string",
  insight: "Every palindrome has a middle. Drop a pebble on every letter and in every gap between letters, and let a ripple grow while the two letters it reaches are the same. Each time it grows, that is one more palindrome.",
  metaphor: {
    name: "The pebble and the ripple",
    legend: "pebble on a letter = count(s, center, center) · pebble in a gap = count(s, center, center + 1) · ripple edges = left, right · wall = index −1 or s.length() · found = total",
    terms: ["pebble", "ripple", "middle", "gap", "wall"],
  },
  traps: [{ name: "The Gap Trap", rule: "A palindrome with an even number of letters has its middle in a gap. Expand from (center, center + 1) as well as from (center, center)." }],
  template: [
    "for (center = 0..n-1)",
    "    total += grow(center, center);        // middle on a letter",
    "    total += grow(center, center + 1);    // middle in a gap",
    "grow(left, right): while (both inside and s[left] matches s[right]) { count one; step both outwards }",
  ],
  complexity: {
    slow: "O(n³)",
    time: "O(n²)",
    timeWhy: "about 2n middles, and each ripple grows at most n letters wide",
    space: "O(1)",
    spaceWhy: "only a count and the two edges of the ripple are kept",
  },
  code: CODE,
  examples: [
    { label: '"abba"', input: "abba", expected: "6", note: "Tricky: its biggest palindromes have their middle in a gap" },
    { label: '"aaa"', input: "aaa", expected: "6" },
    { label: '"level"', input: "level", expected: "7" },
    { label: '"abc"', input: "abc", expected: "3", note: "No ripple ever grows" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-5", title: "Longest Palindromic Substring" },
    { slug: "lc-125", title: "Valid Palindrome" },
    { slug: "lc-131", title: "Palindrome Partitioning" },
  ],
  answer: (raw) => String(countPalindromes(parseInput(raw))),
  frames: (raw) => {
    const chars = parseInput(raw);
    const { drops, pairs } = dropAll(chars);
    const total = drops.reduce((sum, drop) => sum + drop.grown.length, 0);
    const practice = parseInput(PRACTICE);
    const practiceDrops = dropAll(practice).drops;
    const practiceTotal = practiceDrops.reduce((sum, drop) => sum + drop.grown.length, 0);
    return [
      ...pictureFrames(chars, drops, total),
      ...slowFrames(chars, runSlow(chars)),
      ...insightFrames(chars, drops),
      ...solutionFrames(chars, drops, "solution", false),
      ...endFrames(chars, drops, pairs),
      ...solutionFrames(practice, practiceDrops, "card", true),
      {
        scene: "card",
        caption: `Done. Every letter and every gap had its pebble, and the count is ${practiceTotal}. The answer is ${practiceTotal}.`,
        state: remembered(practice, practiceDrops),
      },
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remembered(chars, drops),
      },
    ];
  },
  View: AgyDp3CentresView,
};
