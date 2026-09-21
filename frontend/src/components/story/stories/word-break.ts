import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp2StonesView, type StoneHop, type StonesState } from "../agy-dp2-stones-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;
type Input = { s: string; words: string[] };

/** Fresh string for the "your turn" run: "car" and "cars" both light a stone, and only one of them lets "go" land. */
const PRACTICE = 's="carsgo", wordDict=["car","cars","go"]';

const CODE = [
  "Set<String> words = new HashSet<>(wordDict);",
  "boolean[] dp = new boolean[s.length() + 1];",
  "dp[0] = true;",
  "for (int end = 1; end <= s.length(); end++) {",
  "    for (int start = 0; start < end; start++) {",
  "        if (dp[start] && words.contains(s.substring(start, end))) {",
  "            dp[end] = true;",
  "            break;",
  "        }",
  "    }",
  "}",
  "return dp[s.length()];",
];

/** The slow way stops counting here, so a large input cannot freeze the page. */
const SLOW_CAP = 20000;

function parseInput(raw: string): Input {
  const s = raw.match(/s\s*=\s*"([a-z]*)"/i)?.[1] ?? "";
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const words = [...new Set([...list.matchAll(/"([a-z]+)"/gi)].map((match) => match[1]))];
  if (s.length === 0 || words.length === 0) return { s: "leetcode", words: ["leet", "code"] };
  return { s, words };
}

const q = (text: string) => `"${text}"`;

function listOf(items: (string | number)[], joiner = "and") {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items.at(-1)}`;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Independent solver for `answer()`: asks "can the rest be cut from here?" and remembers each reply. */
function canBreak({ s, words }: Input): boolean {
  const known = new Map<number, boolean>();
  const from = (start: number): boolean => {
    if (start === s.length) return true;
    const seen = known.get(start);
    if (seen !== undefined) return seen;
    const ok = words.some((word) => s.startsWith(word, start) && from(start + word.length));
    known.set(start, ok);
    return ok;
  };
  return from(0);
}

type Table = {
  lit: boolean[];
  /** The stone the first successful hop came from. */
  via: (number | null)[];
  /** Steps of the inner loop. */
  looks: number;
  /** Questions put to the set of words. */
  asks: number;
  /** Words that would be read if the plain list were asked instead. */
  listReads: number;
};

function fill({ s, words }: Input): Table {
  const set = new Set(words);
  const lit = Array.from({ length: s.length + 1 }, () => false);
  const via: (number | null)[] = Array.from({ length: s.length + 1 }, () => null);
  lit[0] = true;
  let looks = 0;
  let asks = 0;
  let listReads = 0;
  for (let end = 1; end <= s.length; end++) {
    for (let start = 0; start < end; start++) {
      looks++;
      if (!lit[start]) continue;
      const piece = s.slice(start, end);
      asks++;
      const position = words.indexOf(piece);
      listReads += position === -1 ? words.length : position + 1;
      if (set.has(piece)) {
        lit[end] = true;
        via[end] = start;
        break;
      }
    }
  }
  return { lit, via, looks, asks, listReads };
}

/** The cuts of the winning chain, stone 0 first. Walks back from `end` along the first hop found for each stone. */
function chainTo(table: Table, end: number): number[] {
  const cuts = [end];
  let at = end;
  while (at > 0) {
    const from = table.via[at];
    if (from === null) return [];
    cuts.unshift(from);
    at = from;
  }
  return cuts;
}

function hopsOf({ s }: Input, cuts: number[], tone: StoneHop["tone"]): StoneHop[] {
  return cuts.slice(1).map((to, index) => ({ from: cuts[index], to, label: s.slice(cuts[index], to), tone, level: 0 }));
}

/** Shortest arc lowest, so nested arcs never share a height. */
function levelled(hops: Omit<StoneHop, "level">[]): StoneHop[] {
  const order = [...hops.keys()].sort((a, b) => hops[a].to - hops[a].from - (hops[b].to - hops[b].from) || a - b);
  return hops.map((hop, index) => ({ ...hop, level: order.indexOf(index) }));
}

function blank({ s, words }: Input): StonesState {
  return {
    chipsLabel: "words",
    chips: words.map((text) => ({ text, tone: "idle" as CellTone })),
    rowLabels: [],
    stones: Array.from({ length: s.length + 1 }, (_, index) => ({ marks: [null], tone: "idle" as CellTone, label: String(index) })),
    items: [...s].map((text) => ({ text, tone: "idle" as CellTone })),
    itemsLabel: "letters",
    itemsAt: "between",
    here: null,
    pointers: [],
    hops: [],
    pickMode: "stones",
    bestNote: null,
    trapNote: null,
    counter: null,
  };
}

function paintLetters(state: StonesState, from: number, to: number, tone: CellTone): StonesState {
  return { ...state, items: state.items?.map((item, index) => (index >= from && index < to ? { ...item, tone } : item)) ?? null };
}

function finished(input: Input, table: Table): StonesState {
  const last = input.s.length;
  const cuts = table.lit[last] ? chainTo(table, last) : [];
  const onChain = new Set(cuts);
  const state = blank(input);
  return {
    ...state,
    chips: state.chips.map((chip) => ({ ...chip, tone: "hit" as CellTone })),
    stones: state.stones.map((stone, index) => ({ ...stone, marks: [table.lit[index] ? "yes" : "–"], tone: onChain.has(index) ? "done" : table.lit[index] ? "hit" : "faded" })),
    items: state.items?.map((item) => ({ ...item, tone: table.lit[last] ? ("hit" as CellTone) : item.tone })) ?? null,
    hops: hopsOf(input, cuts, "best"),
  };
}

function pictureFrames(input: Input, table: Table): Frame[] {
  const { s, words } = input;
  const last = s.length;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `This is ${q(s)}, with no spaces. The word list is ${words.map(q).join(", ")}. A round stone marks every place where the string could be cut.`,
      state: blank(input),
    },
  ];
  if (table.lit[last]) {
    const cuts = chainTo(table, last);
    const pieces = cuts.slice(1).map((to, index) => s.slice(cuts[index], to));
    frames.push({
      scene: "picture",
      caption: `Allowed: cut it into ${pieces.join(" + ")}. Every piece is a word from the list. A word may be used more than once.`,
      state: { ...paintLetters(blank(input), 0, last, "hit"), hops: hopsOf(input, cuts, "best") },
    });
  }
  const far = table.lit.lastIndexOf(true);
  const firstLit = table.lit.indexOf(true, 1);
  if (!table.lit[last] && firstLit > 0) {
    frames.push({
      scene: "picture",
      caption: `Allowed: a first piece ${q(s.slice(0, firstLit))}. It is a word from the list. A word may be used more than once.`,
      state: { ...paintLetters(blank(input), 0, firstLit, "hit"), hops: [{ from: 0, to: firstLit, label: s.slice(0, firstLit), tone: "best", level: 0 }] },
    });
  }
  if (!table.lit[last] && far > 0) {
    const cuts = chainTo(table, far);
    const pieces = cuts.slice(1).map((to, index) => s.slice(cuts[index], to));
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${pieces.join(" + ")} leaves ${q(s.slice(far))} over, and that is not a word. Every letter must belong to a word.`,
      state: { ...paintLetters(paintLetters(blank(input), 0, far, "window"), far, last, "miss"), hops: hopsOf(input, cuts, "try") },
    });
  } else {
    const dark = table.lit.indexOf(false);
    if (dark > 0) {
      frames.push({
        scene: "picture",
        caption: `Not allowed: a first piece ${q(s.slice(0, dark))}. It is not a word from the list, and every letter must belong to a word.`,
        state: { ...paintLetters(blank(input), 0, dark, "miss"), hops: [{ from: 0, to: dark, label: s.slice(0, dark), tone: "trap", level: 0 }] },
      });
    }
  }
  frames.push({
    scene: "picture",
    caption: "The goal: say true if the whole string can be cut into words from the list, and false if it cannot.",
    state: blank(input),
  });
  return frames;
}

type SlowRun = { checks: number; capped: boolean; ends: { cuts: number[]; landed: boolean; checksSoFar: number }[]; visits: number[] };

/** Really runs the plain recursion: try a first word, then cut the rest the same way. Counts every piece it checks. */
function runSlow({ s, words }: Input): SlowRun {
  const set = new Set(words);
  const run: SlowRun = { checks: 0, capped: false, ends: [], visits: Array.from({ length: s.length + 1 }, () => 0) };
  const cuts = [0];
  const from = (start: number): boolean => {
    run.visits[start]++;
    if (start === s.length) {
      if (run.ends.length < 2) run.ends.push({ cuts: [...cuts], landed: true, checksSoFar: run.checks });
      return true;
    }
    let moved = false;
    for (let end = start + 1; end <= s.length; end++) {
      if (run.checks >= SLOW_CAP) {
        run.capped = true;
        return false;
      }
      run.checks++;
      if (!set.has(s.slice(start, end))) continue;
      moved = true;
      cuts.push(end);
      const ok = from(end);
      cuts.pop();
      if (ok) return true;
    }
    if (!moved && run.ends.length < 2) run.ends.push({ cuts: [...cuts], landed: false, checksSoFar: run.checks });
    return false;
  };
  from(0);
  return run;
}

function slowFrames(input: Input, run: SlowRun): Frame[] {
  const { s } = input;
  const last = s.length;
  const frames: Frame[] = [];
  run.ends.forEach((end, index) => {
    const pieces = end.cuts.slice(1).map((to, at) => s.slice(end.cuts[at], to));
    const at = end.cuts.at(-1) ?? 0;
    const told = pieces.length === 0 ? "no first word fits at all" : end.landed ? `${pieces.join(" + ")} uses every letter` : `${pieces.join(" + ")}, then it is stuck: no word starts the rest, ${q(s.slice(at))}`;
    frames.push({
      scene: "slow",
      caption: index === 0 ? `The slow way: pick a first word, then cut the rest the same way, and step back when stuck. First try: ${told}.` : `Step back, pick another word, and go again: ${told}.`,
      state: {
        ...paintLetters(paintLetters(blank(input), 0, at, "window"), at, end.landed ? at : last, "miss"),
        hops: hopsOf(input, end.cuts, "try"),
        counter: { label: "pieces checked", value: String(end.checksSoFar) },
      },
    });
  });
  const total = run.capped ? `more than ${SLOW_CAP}` : String(run.checks);
  const repeated = run.visits.map((count, stone) => ({ count, stone })).filter((visit) => visit.stone > 0 && visit.stone < last && visit.count > 1).sort((a, b) => b.count - a.count)[0];
  frames.push({
    scene: "slow",
    caption: repeated
      ? `${total} pieces checked. It came to the cut after ${q(s.slice(0, repeated.stone))} ${repeated.count} times, and cut the same rest from scratch each time. That grows to O(2^n) time.`
      : `${total} pieces checked: this string was kind. But nothing is written down, so an unlucky string has the same rest cut again and again: O(2^n) time.`,
    state: { ...blank(input), items: blank(input).items?.map((item) => ({ ...item, tone: "faded" as CellTone })) ?? null, counter: { label: "pieces checked", value: run.capped ? `${SLOW_CAP}+` : String(run.checks) } },
  });
  return frames;
}

function insightFrames(input: Input, table: Table): Frame[] {
  const { s, words } = input;
  const last = s.length;
  const firstLit = table.lit.indexOf(true, 1);
  const shown = firstLit === -1 ? last : firstLit;
  const meaning = paintLetters(blank(input), 0, shown, "window");
  meaning.here = shown;
  meaning.stones = meaning.stones.map((stone, index) => (index === shown ? { ...stone, tone: "edge" as CellTone } : stone));

  const endings = words.filter((word) => s.endsWith(word)).map((word) => ({ from: last - word.length, to: last, label: word, tone: "try" as const }));
  const asked = blank(input);
  asked.here = last;
  asked.stones = asked.stones.map((stone, index) => (index === last ? { ...stone, tone: "edge" as CellTone } : endings.some((hop) => hop.from === index) ? { ...stone, tone: "window" as CellTone } : stone));
  asked.hops = levelled(endings);

  return [
    {
      scene: "insight",
      caption: `Picture a stepping stone at every cut. Stone ${shown} means one thing: can the first ${shown} letters, ${q(s.slice(0, shown))}, be cut into words? If yes, the stone is lit.`,
      state: meaning,
    },
    {
      scene: "insight",
      caption:
        endings.length === 0
          ? `Stand on the last stone, ${last}, and ask: which word was the last hop? Here no word from the list fits the last letters.`
          : `Stand on the last stone, ${last}, and ask: which word was the last hop? A word is a hop of its own length, so it started on stone ${listOf(endings.map((hop) => hop.from), "or")}.`,
      state: asked,
    },
    {
      scene: "insight",
      caption: "So a stone is lit when one word hops onto it from a lit stone behind it. Stone 0 is lit from the start. We light the stones from left to right, once.",
      state: { ...asked, stones: asked.stones.map((stone, index) => (index === 0 ? { ...stone, marks: ["yes"], tone: "hit" as CellTone } : stone)), hops: asked.hops.map((hop) => ({ ...hop, tone: "best" as const })) },
    },
  ];
}

type Try = { start: number; piece: string; ok: boolean };

function whereFromQuiz(input: Input, lit: boolean[], end: number, answer: number): StoryQuiz {
  const { s } = input;
  const feedback: Record<number, string> = { [end]: "That is the stone we stand on. The hop starts somewhere behind it." };
  for (let start = 0; start < end; start++) {
    if (start === answer) continue;
    feedback[start] = lit[start]
      ? `Stone ${start} is lit, but the hop from it would be ${q(s.slice(start, end))}. That is not in the set of words.`
      : `Stone ${start} is dark: the first ${start} letters cannot be cut into words, so no hop may start there.`;
  }
  return {
    kind: "cell",
    cells: s.length + 1,
    numbered: s.length <= 9,
    question: `A word hops onto stone ${end}. Which stone does it start from? Click it.`,
    answer,
    feedback,
    otherwise: "A hop only goes forward. Pick a stone behind the one we stand on.",
    why: `${q(s.slice(answer, end))} is in the set, and it starts on a lit stone. Both things are needed.`,
  };
}

function lightsUpQuiz(end: number, lights: boolean, why: string): StoryQuiz {
  return {
    kind: "choice",
    question: `Does stone ${end} light up?`,
    options: ["Yes, it lights up", "No, it stays dark"],
    answer: lights ? 0 : 1,
    why,
  };
}

/**
 * The real table, stone by stone. `practice` reuses it on a fresh string: the reader decides at every stone that has a real decision.
 */
function walkFrames(input: Input, table: Table, scene: SceneId, practice: boolean): Frame[] {
  const { s, words } = input;
  const set = new Set(words);
  const last = s.length;
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const lit = Array.from({ length: last + 1 }, () => false);
  const marks: (string | null)[] = Array.from({ length: last + 1 }, () => null);
  const tones: CellTone[] = Array.from({ length: last + 1 }, () => "idle");
  let chipTone: CellTone = "idle";

  const at = (stone: number | null, hops: StoneHop[] = [], letters?: { from: number; to: number; tone: CellTone }): StonesState => {
    const state = blank(input);
    state.chips = state.chips.map((chip) => ({ ...chip, tone: chipTone }));
    state.stones = state.stones.map((item, index) => ({ ...item, marks: [marks[index]], tone: index === stone && tones[index] !== "hit" ? "edge" : tones[index] }));
    state.here = stone;
    state.hops = hops;
    return letters ? paintLetters(state, letters.from, letters.to, letters.tone) : state;
  };
  const triesFor = (end: number): Try[] => {
    const tries: Try[] = [];
    for (let start = 0; start < end; start++) {
      if (!lit[start]) continue;
      const piece = s.slice(start, end);
      tries.push({ start, piece, ok: set.has(piece) });
      if (set.has(piece)) break;
    }
    return tries;
  };
  const fan = (end: number, tries: Try[], paint: (item: Try) => StoneHop["tone"]) => levelled(tries.map((item) => ({ from: item.start, to: end, label: item.piece, tone: paint(item) })));
  const litBehind = (end: number) => lit.map((value, index) => (value && index < end ? index : -1)).filter((index) => index >= 0);

  if (practice) {
    frames.push({ scene, caption: `Your turn, on a new string: ${q(s)}, with the words ${words.map(q).join(", ")}. You decide what happens at the stones.`, state: at(null) });
    frames.push({
      scene,
      caption: "The words arrive as a plain list. The stones will ask it many times: is this piece a word?",
      state: at(null),
      quiz: {
        kind: "choice",
        question: "What do we do with the list before the first stone?",
        options: ["Pour the words into a set", "Keep the list and start hopping"],
        answer: 0,
        why: "A set answers each question in one look. A plain list is read word by word, every time.",
      },
    });
    chipTone = "hit";
    marks.fill("–");
    marks[0] = "yes";
    lit[0] = true;
    tones[0] = "hit";
    frames.push({ scene, caption: "Into a set. That steps around the Long List Trap. All stones start dark, except stone 0, which is lit from the start.", state: at(0) });
  } else {
    chipTone = "hit";
    frames.push({ scene, caption: `First, pour the word list into a set. A set answers "is this piece a word?" in one look, however many words it holds.`, codeLine: 0, state: at(null) });
    marks.fill("–");
    frames.push({
      scene,
      caption: `Lay out one stone at every cut, 0 to ${last}. Stone i will say if the first i letters can be cut into words. For now every stone is dark.`,
      codeLine: 1,
      state: at(null),
    });
    marks[0] = "yes";
    lit[0] = true;
    tones[0] = "hit";
    frames.push({ scene, caption: "Stone 0 is lit from the start. Before the first letter there is nothing left to cut.", codeLine: 2, state: at(0) });
  }

  let shownFirstLit = false;
  let shownFirstDark = false;
  let shownManyBehind = false;
  let shownNearMiss = false;
  let shownBreak = false;
  let askedWhere = false;
  let plain: number[] = [];
  const flush = () => {
    if (plain.length === 0) return;
    const end = plain.at(-1)!;
    const names = plain.length === 1 ? `Stone ${end}` : plain.length === 2 ? `Stones ${plain[0]} and ${end}` : `Stones ${plain[0]} to ${end}`;
    frames.push({
      scene,
      caption: plain.length === 1 ? `${names}: no word hops onto it from a lit stone. It stays dark.` : `${names}: no word hops onto any of them from a lit stone. They stay dark.`,
      codeLine: line(5),
      state: at(end, fan(end, triesFor(end), () => "faded")),
    });
    plain = [];
  };

  for (let end = 1; end <= last; end++) {
    const tries = triesFor(end);
    const found = tries.find((item) => item.ok) ?? null;
    const behind = litBehind(end);
    const sources = behind.filter((start) => set.has(s.slice(start, end)));
    const isLast = end === last;
    const name = isLast ? `the last stone, ${end}` : `stone ${end}`;

    if (found) {
      const unique = sources.length === 1;
      const detailed = practice || !shownFirstLit || isLast;
      if (!detailed) {
        flush();
        lit[end] = true;
        marks[end] = "yes";
        tones[end] = "hit";
        frames.push({
          scene,
          caption: `Stone ${end}: the word ${q(found.piece)} hops from stone ${found.start}, which is lit. Stone ${end} lights up.`,
          codeLine: line(6),
          state: at(end, fan(end, [found], () => "best"), { from: found.start, to: end, tone: "hit" }),
        });
        continue;
      }
      flush();
      shownFirstLit = true;
      const ask = unique && (practice || !askedWhere);
      if (ask) {
        askedWhere = true;
        frames.push({
          scene,
          caption: `Stand on ${name}. It lights up only if a word from the set hops onto it from a lit stone behind it.`,
          codeLine: line(5),
          state: at(end),
          quiz: whereFromQuiz(input, lit, end, found.start),
        });
      } else {
        frames.push({
          scene,
          caption: `Stand on ${name}. Look back at the lit stones: ${listOf(behind)}. A hop from there must be a whole word from the set.`,
          codeLine: line(5),
          state: at(end, fan(end, tries, () => "try")),
        });
      }
      const failed = tries.filter((item) => !item.ok);
      lit[end] = true;
      marks[end] = "yes";
      tones[end] = "hit";
      const misses = failed.length > 0 && failed.length <= 2 ? `${listOf(failed.map((item) => q(item.piece)))} ${failed.length === 1 ? "is" : "are"} not in the set. But ` : "";
      frames.push({
        scene,
        caption: `${misses}${misses ? "the" : "The"} word ${q(found.piece)} hops from stone ${found.start}, which is lit. Stone ${end} lights up: the first ${end} letters can be cut into words.`,
        codeLine: line(6),
        state: at(end, fan(end, tries, (item) => (item.ok ? "best" : "faded")), { from: found.start, to: end, tone: "hit" }),
      });
      if (!practice && !shownBreak && found.start < end - 1) {
        shownBreak = true;
        frames.push({
          scene,
          caption: `One hop is enough. We stop looking back from stone ${end} and move on to the next stone.`,
          codeLine: 7,
          state: at(end, fan(end, [found], () => "best")),
        });
      }
      continue;
    }

    // A dark stone.
    const nearMiss = words.map((word) => ({ word, start: end - word.length })).find((item) => item.start >= 0 && !lit[item.start] && s.slice(item.start, end) === item.word) ?? null;
    if (nearMiss && (practice || !shownNearMiss)) {
      flush();
      shownNearMiss = true;
      frames.push({
        scene,
        caption: `Stand on ${name}. The word ${q(nearMiss.word)} fits the letters just before it. That hop would start on stone ${nearMiss.start}.`,
        codeLine: line(5),
        state: at(end, [{ from: nearMiss.start, to: end, label: nearMiss.word, tone: "try", level: 0 }], { from: nearMiss.start, to: end, tone: "window" }),
        quiz: lightsUpQuiz(end, false, `A word alone is not enough. Its hop must start on a lit stone, and stone ${nearMiss.start} is dark.`),
      });
      marks[end] = "–";
      frames.push({
        scene,
        caption: `No. ${q(nearMiss.word)} is a word, but stone ${nearMiss.start} is dark: ${q(s.slice(0, nearMiss.start))} cannot be cut into words. So stone ${end} stays dark.`,
        codeLine: line(5),
        state: at(end, [{ from: nearMiss.start, to: end, label: nearMiss.word, tone: "trap", level: 0 }], { from: 0, to: nearMiss.start, tone: "miss" }),
      });
      continue;
    }
    if (!practice && !shownFirstDark) {
      flush();
      shownFirstDark = true;
      if (behind.length > 1) shownManyBehind = true;
      frames.push({
        scene,
        caption: `Stand on ${name}. Look back at every lit stone: ${behind.length === 1 ? `only stone ${behind[0]}` : listOf(behind)}. A hop from there must be a whole word from the set.`,
        codeLine: line(5),
        state: at(end, fan(end, tries, () => "try"), { from: tries[0]?.start ?? 0, to: end, tone: "window" }),
      });
      const pieces = tries.map((item) => q(item.piece));
      frames.push({
        scene,
        caption: `${pieces.length <= 3 ? listOf(pieces) : "Each of those pieces"} is not in the set, so no hop lands. Stone ${end} stays dark.`,
        codeLine: line(5),
        state: at(end, fan(end, tries, () => "faded")),
      });
      continue;
    }
    if (behind.length > 1 && (practice || !shownManyBehind)) {
      flush();
      shownManyBehind = true;
      const long = `Stone ${end}. The lit stones behind it are ${listOf(behind)}. Their hops would be ${listOf(tries.map((item) => q(item.piece)))}.`;
      const intro = long.length <= 150 ? long : `Stone ${end}. The lit stones behind it are ${listOf(behind)}. Each hop from them must be a whole word.`;
      if (practice) {
        frames.push({
          scene,
          caption: intro,
          state: at(end, fan(end, tries, () => "try")),
          quiz: lightsUpQuiz(end, false, "None of those pieces is in the set, so no hop lands here."),
        });
        frames.push({ scene, caption: `No. None of those pieces is a word, so stone ${end} stays dark.`, state: at(end, fan(end, tries, () => "faded")) });
      } else {
        frames.push({ scene, caption: intro, codeLine: 5, state: at(end, fan(end, tries, () => "try")) });
        frames.push({ scene, caption: `None of those pieces is a word, so no hop lands. Stone ${end} stays dark.`, codeLine: 5, state: at(end, fan(end, tries, () => "faded")) });
      }
      continue;
    }
    plain.push(end);
  }
  flush();

  const done = finished(input, table);
  const cuts = table.lit[last] ? chainTo(table, last) : [];
  const pieces = cuts.slice(1).map((to, index) => s.slice(cuts[index], to));
  if (practice) {
    frames.push({
      scene,
      caption: table.lit[last] ? `Done. The last stone is lit by ${pieces.join(" + ")}, so the answer is true. You lit every stone yourself.` : `Done. The last stone stays dark, so the answer is false. You judged every stone yourself.`,
      state: done,
    });
    return frames;
  }
  frames.push({
    scene,
    caption: table.lit[last]
      ? `The last stone is lit, so the whole string can be cut: ${pieces.join(" + ")}. The answer is true.`
      : `The last stone, ${last}, stays dark: no word hops onto it from a lit stone. The answer is false.`,
    codeLine: 11,
    state: { ...done, here: table.lit[last] ? null : last },
  });
  frames.push({
    scene,
    caption: `The Long List Trap: asking the plain list, not a set. A list is read word by word: the ${plural(table.asks, "question")} here would read ${plural(table.listReads, "word")}. A set takes one look each.`,
    codeLine: 0,
    state: { ...done, hops: [], chips: done.chips.map((chip) => ({ ...chip, tone: "miss" as CellTone })), counter: { label: "list words read", value: String(table.listReads) }, trapNote: `${plural(table.asks, "question")} · a list reads ${plural(table.listReads, "word")} · a set takes one look each` },
  });
  frames.push({
    scene,
    caption: `Time: O(n³). Each of the ${last} stones looks back at up to ${last} stones, and each look reads up to ${last} letters. Here that was ${plural(table.looks, "look")} back.`,
    codeLine: 4,
    state: { ...done, counter: { label: "looks back", value: String(table.looks) } },
  });
  frames.push({
    scene,
    caption: `Space: O(n). One yes or no per stone: ${last + 1} stones. The set of words is kept beside them.`,
    codeLine: 1,
    state: { ...done, hops: [], stones: done.stones.map((stone) => ({ ...stone, tone: "done" as CellTone })) },
  });
  return frames;
}

export const wordBreakStory: ProblemStory<StonesState> = {
  slugs: ["lc-139"],
  pattern: "1-D DP",
  trigger: "“can this string be cut into words from a list?”",
  insight: "A stepping stone at every cut. A stone is lit when one word hops onto it from a lit stone behind it. Stone 0 starts lit; the answer is the last stone.",
  metaphor: {
    name: "The stepping stones",
    legend: "stone i = dp[i] · lit = true · a hop = one word from the set, s.substring(start, end) · here = end · the stone behind = start",
    terms: ["stone", "hop", "lit", "dark"],
  },
  traps: [{ name: "The Long List Trap", rule: "Never ask the plain wordDict list: every question reads it word by word. Pour it into a HashSet first, so each question is one look." }],
  template: [
    "ok[0] = true;",
    "for (end = 1; end <= n; end++)",
    "    for (each start behind end)",
    "        if (ok[start] and piece(start, end) is allowed) { ok[end] = true; stop looking; }",
    "return ok[n];",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n³)",
    timeWhy: "n stones, each looks back at up to n stones, and each look reads a piece of up to n letters",
    space: "O(n)",
    spaceWhy: "one yes or no per stone, plus the set of words",
  },
  code: CODE,
  examples: [
    { label: '"leetcode"', input: 's="leetcode", wordDict=["leet","code"]', expected: "true" },
    { label: '"catsandog"', input: 's="catsandog", wordDict=["cats","dog","sand","and","cat"]', expected: "false", note: "A word fits the end, but its hop starts on a dark stone" },
    { label: '"aaaaaaa"', input: 's="aaaaaaa", wordDict=["aaaa","aaa"]', expected: "true", note: "Words used again, and hops that overlap" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-322", title: "Coin Change" },
    { slug: "lc-91", title: "Decode Ways" },
    { slug: "lc-300", title: "Longest Increasing Subsequence" },
  ],
  answer: (raw) => String(canBreak(parseInput(raw))),
  frames: (raw) => {
    const input = parseInput(raw);
    const table = fill(input);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(input, table),
      ...slowFrames(input, runSlow(input)),
      ...insightFrames(input, table),
      ...walkFrames(input, table, "solution", false),
      ...walkFrames(practice, fill(practice), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(input, table),
      },
    ];
  },
  View: AgyDp2StonesView,
};
