import type { CellTone } from "@/components/learn/viz/primitives";

import { LcsTableView, type LcsLink, type LcsTableState, type Square } from "../lcs-table-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type LcsFrame = StoryFrame<LcsTableState>;
type Words = { text1: string; text2: string };

/** Fresh words for the "your turn" run: two matches, and copies from both the top and the left. */
const PRACTICE = 'text1="sea", text2="eat"';

const CODE = [
  "int m = a.length(), n = b.length();",
  "int[][] dp = new int[m + 1][n + 1];",
  "for (int i = 1; i <= m; i++) {",
  "    for (int j = 1; j <= n; j++) {",
  "        if (a.charAt(i - 1) == b.charAt(j - 1)) {",
  "            dp[i][j] = dp[i - 1][j - 1] + 1;",
  "        } else {",
  "            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);",
  "        }",
  "    }",
  "}",
  "return dp[m][n];",
];

/** The slow way stops here, so a long word cannot freeze the page. */
const SLOW_CAP = 1 << 14;

function parseInput(raw: string): Words {
  const quoted = [...raw.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quoted.length < 2 || !quoted[0] || !quoted[1]) return { text1: "abcde", text2: "ace" };
  return { text1: quoted[0], text2: quoted[1] };
}

type Kind = "match" | "top" | "left" | "tie";

type Solved = {
  table: number[][];
  /** Walk back from the corner: every square stepped on, corner first. */
  path: Square[];
  /** Shared letters on that path, in reading order. */
  pairs: { top: number; bottom: number }[];
  filled: number;
};

function solve({ text1, text2 }: Words): Solved {
  const m = text1.length;
  const n = text2.length;
  const table = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  let filled = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      filled++;
      table[i][j] = text1[i - 1] === text2[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  const path: Square[] = [[m, n]];
  const pairs: Solved["pairs"] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (text1[i - 1] === text2[j - 1]) {
      pairs.unshift({ top: i - 1, bottom: j - 1 });
      i--;
      j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) i--;
    else j--;
    path.push([i, j]);
  }
  return { table, path, pairs, filled };
}

function kindOf({ text1, text2 }: Words, table: number[][], [i, j]: Square): Kind {
  if (text1[i - 1] === text2[j - 1]) return "match";
  if (table[i - 1][j] === table[i][j - 1]) return "tie";
  return table[i - 1][j] > table[i][j - 1] ? "top" : "left";
}

function listOf(items: string[], joiner = "and") {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items.at(-1)}`;
}

function blank({ text1, text2 }: Words, mode: LcsTableState["mode"]): LcsTableState {
  const rows = text1.length + 1;
  const columns = text2.length + 1;
  return {
    text1,
    text2,
    mode,
    links: [],
    topTones: Array.from({ length: text1.length }, () => "idle" as CellTone),
    bottomTones: Array.from({ length: text2.length }, () => "idle" as CellTone),
    wordNote: null,
    backwards: null,
    table: Array.from({ length: rows }, () => Array.from({ length: columns }, () => null)),
    tones: Array.from({ length: rows }, () => Array.from({ length: columns }, () => "idle" as CellTone)),
    rowTones: Array.from({ length: rows }, () => "idle" as CellTone),
    columnTones: Array.from({ length: columns }, () => "idle" as CellTone),
    here: null,
    arrows: [],
    path: [],
    trap: null,
    badge: null,
    answer: null,
    counter: null,
  };
}

function wordsState(words: Words, pairs: { top: number; bottom: number }[], tone: LcsLink["tone"], extra: Partial<LcsTableState> = {}): LcsTableState {
  const state = blank(words, "words");
  const links: LcsLink[] = pairs.map((pair) => ({ ...pair, tone }));
  for (const pair of pairs) {
    state.topTones[pair.top] = tone === "good" ? "done" : tone === "bad" ? "miss" : "window";
    state.bottomTones[pair.bottom] = tone === "good" ? "done" : tone === "bad" ? "miss" : "window";
  }
  return { ...state, links, ...extra };
}

function pictureFrames(words: Words, solved: Solved): LcsFrame[] {
  const { text1, text2 } = words;
  const { pairs } = solved;
  // Every letter of the first word that also sits in the second, joined to its first free partner. Order is ignored here.
  const shared: { top: number; bottom: number }[] = [];
  [...text1].forEach((letter, top) => {
    const bottom = [...text2].findIndex((other, index) => other === letter && !shared.some((pair) => pair.bottom === index));
    if (bottom !== -1) shared.push({ top, bottom });
  });
  const letters = shared.map((pair) => `'${text1[pair.top]}'`);
  const pick = pairs.map((pair) => text1[pair.top]).join("");
  const frames: LcsFrame[] = [{ scene: "picture", caption: `Two words: "${text1}" and "${text2}". Each box is one letter.`, state: blank(words, "words") }];
  if (pairs.length === 0) {
    frames.push({ scene: "picture", caption: "We look for letters the two words share. These two share no letter at all, so no line can be drawn.", state: blank(words, "words") });
  } else {
    frames.push({
      scene: "picture",
      caption: `Some letters sit in both words: ${listOf(letters)}. A line joins each one to its partner. We want to pick shared letters like these.`,
      state: wordsState(words, shared, "plain"),
    });
    const few = pairs.length >= 2 ? [pairs[0], pairs.at(-1)!] : pairs.slice(0, 1);
    frames.push({
      scene: "picture",
      caption:
        few.length === 2
          ? `Allowed: pick '${text1[few[0].top]}' and '${text1[few[1].top]}'. Skipping letters is fine, as long as the picked ones keep their order. The lines do not cross.`
          : `Allowed: pick '${text1[few[0].top]}'. Skipping the other letters is fine.`,
      state: wordsState(words, few, "good", { wordNote: { text: "order kept: allowed", tone: "teal" } }),
    });
  }

  // A pair of lines that cross, if the words have one.
  let crossing: [{ top: number; bottom: number }, { top: number; bottom: number }] | null = null;
  for (let a = 0; a < text1.length && !crossing; a++) {
    for (let b = a + 1; b < text1.length && !crossing; b++) {
      const late = text2.indexOf(text1[b]);
      const early = text2.lastIndexOf(text1[a]);
      if (late !== -1 && early > late) crossing = [{ top: a, bottom: early }, { top: b, bottom: late }];
    }
  }
  if (crossing) {
    const [first, second] = crossing;
    frames.push({
      scene: "picture",
      caption: `Not allowed: '${text1[first.top]}' together with '${text1[second.top]}'. The first word has '${text1[first.top]}' first, the second word has it after. The lines cross: the order is broken.`,
      state: wordsState(words, crossing, "bad", { wordNote: { text: "✕ lines cross: order broken", tone: "coral" } }),
    });
  } else if (pairs.length >= 2) {
    const first = pairs[0];
    const last = pairs.at(-1)!;
    frames.push({
      scene: "picture",
      caption: `Not allowed: '${text1[last.top]}' before '${text1[first.top]}'. Both words have '${text1[first.top]}' first, and a pick may never change the order.`,
      state: { ...wordsState(words, [first, last], "bad"), links: [], backwards: { from: last.top, to: first.top }, wordNote: { text: "✕ reads backwards: order broken", tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption:
      pairs.length === 0
        ? "The goal: the length of the longest allowed pick. Here nothing is shared, so the answer will be 0."
        : `The goal: the length of the longest allowed pick. Here that pick is "${pick}", so the answer will be ${pairs.length}.`,
    state: wordsState(words, pairs, "good", { answer: pairs.length }),
  });
  return frames;
}

type SlowRun = { tried: number; capped: boolean; firstFits: boolean; best: string; bestMask: number; bestAt: number };

/** Really tries every pick of letters from the first word, longest word first, and checks each against the second word. */
function runSlow({ text1, text2 }: Words): SlowRun {
  const run: SlowRun = { tried: 0, capped: false, firstFits: false, best: "", bestMask: 0, bestAt: 0 };
  const total = 2 ** text1.length;
  for (let mask = total - 1; mask >= 0; mask--) {
    if (run.tried >= SLOW_CAP) {
      run.capped = true;
      break;
    }
    run.tried++;
    const pick = [...text1].filter((_, index) => mask & (1 << (text1.length - 1 - index))).join("");
    let at = 0;
    for (const letter of text2) if (at < pick.length && pick[at] === letter) at++;
    const fits = at === pick.length;
    if (run.tried === 1) run.firstFits = fits;
    if (fits && pick.length > run.best.length) {
      run.best = pick;
      run.bestMask = mask;
      run.bestAt = run.tried;
    }
  }
  return run;
}

function slowFrames(words: Words, run: SlowRun): LcsFrame[] {
  const { text1, text2 } = words;
  const frames: LcsFrame[] = [];
  const all = blank(words, "words");
  frames.push({
    scene: "slow",
    caption: `The slow way: try every possible pick of letters from "${text1}", one at a time. First pick: all of "${text1}". ${run.firstFits ? `It fits inside "${text2}".` : `It does not fit inside "${text2}".`}`,
    state: { ...all, topTones: all.topTones.map(() => (run.firstFits ? "done" : "miss") as CellTone), counter: { label: "picks tried", value: 1 } },
  });
  if (run.bestAt > 1) {
    const picked = [...text1].map((_, index) => Boolean(run.bestMask & (1 << (text1.length - 1 - index))));
    // Line the picked letters up with where they sit in the second word.
    const links: LcsLink[] = [];
    let from = 0;
    picked.forEach((on, index) => {
      if (!on) return;
      const bottom = text2.indexOf(text1[index], from);
      links.push({ top: index, bottom, tone: "good" });
      from = bottom + 1;
    });
    frames.push({
      scene: "slow",
      caption: `Pick number ${run.bestAt} is "${run.best}". It fits inside "${text2}", and nothing longer does. But we only know that after trying every pick.`,
      state: { ...wordsState(words, links, "good"), counter: { label: "picks tried", value: run.bestAt } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `${run.capped ? `We stop after ${run.tried} picks` : `All ${run.tried} picks tried`}, for a word of only ${text1.length} letters. Every extra letter doubles the picks. This is O(2^m × n) time.`,
    state: { ...all, topTones: all.topTones.map(() => "faded" as CellTone), bottomTones: all.bottomTones.map(() => "faded" as CellTone), counter: { label: "picks tried", value: run.tried } },
  });
  return frames;
}

/** The table as it looks just before `stop` is filled (row by row), or completely full when `stop` is null. */
function tableUntil(solved: Solved, stop: Square | null, include = false): (number | null)[][] {
  return solved.table.map((line, i) =>
    line.map((value, j) => {
      if (i === 0 || j === 0 || !stop) return value;
      const before = i < stop[0] || (i === stop[0] && (include ? j <= stop[1] : j < stop[1]));
      return before ? value : null;
    }),
  );
}

function squaresOf({ text1, text2 }: Words): Square[] {
  const squares: Square[] = [];
  for (let i = 1; i <= text1.length; i++) for (let j = 1; j <= text2.length; j++) squares.push([i, j]);
  return squares;
}

function lit(state: LcsTableState, [i, j]: Square): LcsTableState {
  const rowTones = [...state.rowTones];
  const columnTones = [...state.columnTones];
  rowTones[i] = "edge";
  columnTones[j] = "edge";
  return { ...state, rowTones, columnTones, here: [i, j] };
}

function sources(kind: Kind, [i, j]: Square): Square[] {
  if (kind === "match") return [[i - 1, j - 1]];
  if (kind === "top") return [[i - 1, j]];
  if (kind === "left") return [[i, j - 1]];
  return [];
}

function insightFrames(words: Words, solved: Solved): LcsFrame[] {
  const { text1, text2 } = words;
  const squares = squaresOf(words);
  const match = squares.find((square) => kindOf(words, solved.table, square) === "match") ?? null;
  const differ =
    squares.find((square) => kindOf(words, solved.table, square) !== "match" && solved.table[square[0]][square[1]] > 0) ?? squares.find((square) => kindOf(words, solved.table, square) !== "match") ?? null;
  const first = match ?? differ ?? [1, 1];
  const frames: LcsFrame[] = [];
  const asked = lit({ ...blank(words, "table"), table: tableUntil(solved, first) }, first);
  for (let i = 1; i <= first[0]; i++) asked.rowTones[i] = "edge";
  for (let j = 1; j <= first[1]; j++) asked.columnTones[j] = "edge";
  frames.push({
    scene: "insight",
    caption: `Picture a table of small answers. This square asks a small question: how long is the longest shared pick of just "${text1.slice(0, first[0])}" and "${text2.slice(0, first[1])}"?`,
    state: asked,
  });
  if (match) {
    frames.push({
      scene: "insight",
      caption: `Its two letters match: '${text1[match[0] - 1]}'. So step diagonally: take the square up and to the left, and add 1 for the new shared letter.`,
      state: { ...lit({ ...blank(words, "table"), table: tableUntil(solved, match, true) }, match), arrows: [{ from: [match[0] - 1, match[1] - 1], to: match }], badge: { text: "letters match: diagonal + 1", tone: "teal" } },
    });
  }
  if (differ) {
    const kind = kindOf(words, solved.table, differ);
    const from: Square[] = kind === "tie" ? [[differ[0] - 1, differ[1]], [differ[0], differ[1] - 1]] : sources(kind, differ);
    frames.push({
      scene: "insight",
      caption: `Here the letters differ: '${text1[differ[0] - 1]}' and '${text2[differ[1] - 1]}'. One of them is no help, so copy the bigger neighbour: the square on top, or the one on the left.`,
      state: { ...lit({ ...blank(words, "table"), table: tableUntil(solved, differ, true) }, differ), arrows: from.map((square) => ({ from: square, to: differ })), badge: { text: "letters differ: copy the bigger neighbour", tone: "accent" } },
    });
  }
  return frames;
}

function flatten({ text2 }: Words, [i, j]: Square) {
  return i * (text2.length + 1) + j;
}

const OTHERWISE = "That square does not touch the one we are filling. Look at its filled neighbours: on top, on the left, and on the diagonal between them.";

function buildQuiz(words: Words, table: number[][], square: Square, kind: Kind, question: string): StoryQuiz {
  const [i, j] = square;
  const cells = (words.text1.length + 1) * (words.text2.length + 1);
  const diagonal: Square = [i - 1, j - 1];
  const top: Square = [i - 1, j];
  const left: Square = [i, j - 1];
  const feedback: Record<number, string> = { [flatten(words, square)]: "That is the square we are filling. It gets its number from one that is already filled." };
  if (kind === "match") {
    const ignore = "would ignore the new shared letter. A match builds on the picks that end before both letters.";
    feedback[flatten(words, top)] = `The square on top ${ignore}`;
    feedback[flatten(words, left)] = `The square on the left ${ignore}`;
    return {
      kind: "cell",
      cells,
      question,
      answer: flatten(words, diagonal),
      feedback,
      otherwise: OTHERWISE,
      why: "The diagonal square is the best pick before either of these letters. The match adds 1 to it.",
    };
  }
  const bigger = kind === "top" ? top : left;
  const smaller = kind === "top" ? left : top;
  feedback[flatten(words, diagonal)] = "The diagonal is only for letters that match. These two differ.";
  feedback[flatten(words, smaller)] = `That neighbour holds ${table[smaller[0]][smaller[1]]}. The other one holds more, and we want the longest pick.`;
  return {
    kind: "cell",
    cells,
    question,
    answer: flatten(words, bigger),
    feedback,
    otherwise: OTHERWISE,
    why: `The letters differ, so we drop one of them and keep the better of the two neighbours: ${table[bigger[0]][bigger[1]]}.`,
  };
}

/**
 * The real algorithm, square by square. The first square of each kind is told in full;
 * after that, runs of squares with no match are summed up in one frame.
 */
function solutionFrames(words: Words, solved: Solved, slow: SlowRun): LcsFrame[] {
  const { text1, text2 } = words;
  const m = text1.length;
  const n = text2.length;
  const frames: LcsFrame[] = [];
  const grid: (number | null)[][] = solved.table.map((line, i) => line.map((value, j) => (i === 0 || j === 0 ? value : null)));
  const base = (): LcsTableState => ({ ...blank(words, "table"), table: grid.map((line) => [...line]) });
  const seen = new Set<Kind>();
  let askedDiffer = false;

  const empty = base();
  frames.push({
    scene: "solution",
    caption: `Draw the table: one row for each letter of "${text1}", one column for each letter of "${text2}", and one extra row and column for the empty word.`,
    codeLine: 1,
    state: { ...empty, table: empty.table.map((line) => line.map(() => null)) },
  });
  const zeros = base();
  zeros.tones = zeros.tones.map((line, i) => line.map((tone, j) => (i === 0 || j === 0 ? "window" : tone)));
  frames.push({
    scene: "solution",
    caption: "An empty word shares nothing, so the extra row and column are all 0. Every other square will look at these or at squares filled before it.",
    codeLine: 1,
    state: zeros,
  });

  // The square that best shows the off-by-one mistake: a match whose wrong letter would not match.
  const matches = squaresOf(words).filter((square) => kindOf(words, solved.table, square) === "match");
  const trapSquare = matches.find(([i, j]) => i < m && text1[i] !== text2[j - 1]) ?? null;

  let group: Square[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const [i] = group[0];
    const last = group.at(-1)!;
    const values = group.map(([a, b]) => String(solved.table[a][b]));
    const state = lit(base(), last);
    for (const [a, b] of group) state.tones[a][b] = "hit";
    frames.push({
      scene: "solution",
      caption:
        group.length === n
          ? `Row '${text1[i - 1]}' matches no letter of "${text2}". Each square copies its bigger neighbour: ${values.join(", ")}.`
          : group.length === 1
            ? `Next square: '${text1[i - 1]}' and '${text2[last[1] - 1]}' differ, so it copies its bigger neighbour, ${values[0]}.`
            : `The next ${group.length} squares in row '${text1[i - 1]}' have no match. Each copies its bigger neighbour: ${values.join(", ")}.`,
      codeLine: 7,
      state: { ...state, badge: { text: "letters differ: copy the bigger neighbour", tone: "accent" } },
    });
    group = [];
  };

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const square: Square = [i, j];
      const kind = kindOf(words, solved.table, square);
      const value = solved.table[i][j];
      const meet = `Row '${text1[i - 1]}' meets column '${text2[j - 1]}'`;
      const isNew = !seen.has(kind);
      seen.add(kind);

      if (kind !== "match" && !isNew) {
        grid[i][j] = value;
        group.push(square);
        continue;
      }
      flush();

      if (kind === "match") {
        if (isNew) {
          frames.push({
            scene: "solution",
            caption: `${meet}: the two letters match.`,
            codeLine: 4,
            state: { ...lit(base(), square), badge: { text: "letters match", tone: "teal" } },
            quiz: buildQuiz(words, solved.table, square, kind, "The two letters match. Which square do we build on? Click it."),
          });
        }
        grid[i][j] = value;
        const state = lit(base(), square);
        state.tones[i][j] = "done";
        frames.push({
          scene: "solution",
          caption: isNew
            ? `Step diagonally: the square up and to the left holds ${value - 1}. Add 1 for the shared '${text1[i - 1]}'. This square becomes ${value}.`
            : `${meet}: a match. Step diagonally: ${value - 1} + 1 = ${value}.`,
          codeLine: 5,
          state: { ...state, arrows: [{ from: [i - 1, j - 1], to: square }], badge: { text: "letters match: diagonal + 1", tone: "teal" } },
        });
        if (trapSquare && trapSquare[0] === i && trapSquare[1] === j) {
          const trap = { row: i, wrongRow: i + 1 };
          // The right letter turns teal, so it stands against the crossed-out wrong one.
          const rowTones = state.rowTones.map((tone, row) => (row === i ? ("done" as CellTone) : tone));
          frames.push({
            scene: "solution",
            caption: `The Off-By-One Trap: row 0 is the empty word, so row ${i} is letter ${i - 1} of the word, '${text1[i - 1]}'. Asking the word for letter ${i} gives '${text1[i]}', the wrong letter.`,
            codeLine: 4,
            state: { ...state, rowTones, trap, badge: { text: "row and letter numbers differ by 1", tone: "coral" } },
          });
          const wrong = lit(base(), square);
          const wrongValue = Math.max(solved.table[i - 1][j], solved.table[i][j - 1]);
          wrong.table[i][j] = wrongValue;
          wrong.tones[i][j] = "miss";
          frames.push({
            scene: "solution",
            caption: `With '${text1[i]}' against '${text2[j - 1]}' this square would see no match, and wrongly hold ${wrongValue}. So the code always reads the letter one before the row number.`,
            codeLine: 4,
            state: { ...wrong, rowTones, trap, badge: { text: `✕ wrong letter: ${wrongValue} instead of ${value}`, tone: "coral" } },
          });
        }
        continue;
      }

      // The first mismatch of this kind: copied from the top, copied from the left, or a tie.
      const top = solved.table[i - 1][j];
      const left = solved.table[i][j - 1];
      if (kind !== "tie" && !askedDiffer) {
        askedDiffer = true;
        frames.push({
          scene: "solution",
          caption: `${meet}: the letters differ.`,
          codeLine: 4,
          state: { ...lit(base(), square), badge: { text: "letters differ", tone: "accent" } },
          quiz: buildQuiz(words, solved.table, square, kind, "The letters differ. Which neighbour do we copy: the square on top, or the one on the left? Click it."),
        });
      }
      grid[i][j] = value;
      const state = lit(base(), square);
      state.tones[i][j] = "hit";
      frames.push({
        scene: "solution",
        caption:
          kind === "tie"
            ? `${meet}: they differ. The square on top and the one on the left both hold ${top}, so this square becomes ${value}.`
            : `${meet}: they differ. Top holds ${top}, left holds ${left}. Copy the bigger neighbour, the one ${kind === "top" ? "on top" : "on the left"}: this square becomes ${value}.`,
        codeLine: 7,
        state: { ...state, arrows: sources(kind, square).map((from) => ({ from, to: square })), badge: { text: "letters differ: copy the bigger neighbour", tone: "accent" } },
      });
    }
    flush();
  }

  const answer = solved.table[m][n];
  const full = base();
  full.tones[m][n] = "done";
  frames.push({
    scene: "solution",
    caption: `The table is full. The corner square used every letter of both words, and it holds ${answer}. The answer is ${answer}.`,
    codeLine: 11,
    state: { ...full, here: [m, n], answer },
  });
  if (answer > 0) {
    const firstDiagonal = solved.path.findIndex((square, index) => index > 0 && square[0] === solved.path[index - 1][0] - 1 && square[1] === solved.path[index - 1][1] - 1);
    frames.push({
      scene: "solution",
      caption: "To see which letters, walk a path back from the corner. Where the letters match, step diagonally. Otherwise step to the bigger neighbour.",
      codeLine: 11,
      state: { ...full, answer, path: solved.path.slice(0, firstDiagonal + 1) },
    });
    frames.push({
      scene: "solution",
      caption: `Each diagonal step on the path lights one shared letter: ${listOf(solved.pairs.map((pair) => `'${text1[pair.top]}'`))}. Read in order, the pick is "${solved.pairs.map((pair) => text1[pair.top]).join("")}".`,
      codeLine: 11,
      state: remembered(words, solved),
    });
  }
  frames.push({
    scene: "solution",
    caption: `Time: O(m × n). Each of the ${solved.filled} squares was filled once, by looking at 3 neighbours at most.${slow.tried > solved.filled ? ` The slow way tried ${slow.capped ? "more than " : ""}${slow.tried} picks.` : ""}`,
    codeLine: 3,
    state: { ...full, answer, counter: { label: "squares filled", value: solved.filled } },
  });
  const whole = base();
  whole.tones = whole.tones.map((line) => line.map(() => "window" as CellTone));
  frames.push({
    scene: "solution",
    caption: `Space: O(m × n). The table keeps one number per square: ${m + 1} rows × ${n + 1} columns = ${(m + 1) * (n + 1)} numbers.`,
    codeLine: 1,
    state: { ...whole, answer },
  });
  return frames;
}

/** The full table with the path back from the corner and the shared letters lit. */
function remembered(words: Words, solved: Solved): LcsTableState {
  const state = { ...blank(words, "table"), table: tableUntil(solved, null), path: solved.path, answer: solved.pairs.length };
  for (const pair of solved.pairs) {
    state.rowTones[pair.top + 1] = "done";
    state.columnTones[pair.bottom + 1] = "done";
    state.tones[pair.top + 1][pair.bottom + 1] = "done";
  }
  return state;
}

/** The "your turn" run: the reader sizes the table, then picks the source of every square that has one right answer. */
function practiceFrames(words: Words, solved: Solved): LcsFrame[] {
  const { text1, text2 } = words;
  const m = text1.length;
  const n = text2.length;
  const scene: SceneId = "card";
  const frames: LcsFrame[] = [];
  const grid: (number | null)[][] = solved.table.map((line, i) => line.map((value, j) => (i === 0 || j === 0 ? value : null)));
  const base = (): LcsTableState => ({ ...blank(words, "table"), table: grid.map((line) => [...line]) });

  frames.push({
    scene,
    caption: `Your turn, on two new words: "${text1}" and "${text2}". You make every choice, starting with the table itself.`,
    state: blank(words, "words"),
    quiz: {
      kind: "choice",
      question: `"${text1}" has ${m} letters. How many rows must its table have?`,
      options: [`${m - 1} rows`, `${m} rows`, `${m + 1} rows`],
      answer: 2,
      why: "One row per letter, plus row 0 for the empty word. Forgetting that extra row is the Off-By-One Trap.",
    },
  });
  const zeros = base();
  zeros.tones = zeros.tones.map((line, i) => line.map((tone, j) => (i === 0 || j === 0 ? "window" : tone)));
  frames.push({
    scene,
    caption: `${m + 1} rows and ${n + 1} columns: one for each letter, plus row 0 and column 0 for the empty word. Those hold 0, because an empty word shares nothing.`,
    state: zeros,
  });

  let group: Square[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const last = group.at(-1)!;
    const values = group.map(([a, b]) => String(solved.table[a][b]));
    const state = lit(base(), last);
    for (const [a, b] of group) state.tones[a][b] = "hit";
    frames.push({
      scene,
      caption:
        group.length === 1
          ? `Next square: '${text1[last[0] - 1]}' and '${text2[last[1] - 1]}' differ, and top and left hold the same. Nothing to choose: it becomes ${values[0]}.`
          : `The next ${group.length} squares have no match, and their top and left neighbours hold the same. Nothing to choose: they become ${values.join(", ")}.`,
      state,
    });
    group = [];
  };

  for (const square of squaresOf(words)) {
    const [i, j] = square;
    const kind = kindOf(words, solved.table, square);
    const value = solved.table[i][j];
    if (kind === "tie") {
      grid[i][j] = value;
      group.push(square);
      continue;
    }
    flush();
    frames.push({
      scene,
      caption: `Row '${text1[i - 1]}' meets column '${text2[j - 1]}'.`,
      state: lit(base(), square),
      quiz: buildQuiz(words, solved.table, square, kind, "Which square does this one get its number from? Click it."),
    });
    grid[i][j] = value;
    const state = lit(base(), square);
    state.tones[i][j] = kind === "match" ? "done" : "hit";
    frames.push({
      scene,
      caption:
        kind === "match"
          ? `The letters match, so step diagonally: ${value - 1} + 1 = ${value}.`
          : `The letters differ, so copy the bigger neighbour, the one ${kind === "top" ? "on top" : "on the left"}: ${value}.`,
      state: {
        ...state,
        arrows: sources(kind, square).map((from) => ({ from, to: square })),
        badge: kind === "match" ? { text: "letters match: diagonal + 1", tone: "teal" } : { text: "letters differ: copy the bigger neighbour", tone: "accent" },
      },
    });
  }
  flush();

  const pick = solved.pairs.map((pair) => text1[pair.top]).join("");
  frames.push({
    scene,
    caption: `Done. The corner square holds ${solved.table[m][n]}, so the answer is ${solved.table[m][n]}.${pick ? ` The diagonal steps on the path back spell "${pick}".` : ""}`,
    state: remembered(words, solved),
  });
  return frames;
}

export const longestCommonSubsequenceStory: ProblemStory<LcsTableState> = {
  slugs: ["lc-1143"],
  pattern: "Dynamic programming on a table (two words)",
  trigger: "two words or lists, and the “longest” thing they share with the order kept",
  insight: "A table of small answers. Letters match: step diagonally and add 1. Letters differ: copy the bigger neighbour, top or left. The answer sits in the corner.",
  metaphor: {
    name: "The diagonal path",
    legend: "square (row i, column j) = dp[i][j] · row i = letter a.charAt(i - 1) · diagonal = dp[i - 1][j - 1] · corner = dp[m][n]",
    terms: ["square", "diagonal", "corner", "neighbour", "path"],
  },
  traps: [{ name: "The Off-By-One Trap", rule: "The table has an extra row 0 and column 0 for the empty word. So the table is (m + 1) × (n + 1), and row i reads letter i − 1." }],
  template: [
    "table = (m + 1) × (n + 1) zeros;   // row 0, column 0 = empty word",
    "for (i = 1..m) for (j = 1..n)",
    "    if (a[i - 1] matches b[j - 1]) table[i][j] = table[i - 1][j - 1] + 1;",
    "    else table[i][j] = best of table[i - 1][j], table[i][j - 1];",
    "return table[m][n];",
  ],
  complexity: {
    slow: "O(2^m × n)",
    time: "O(m × n)",
    timeWhy: "every square of the table is filled once, from three neighbours",
    space: "O(m × n)",
    spaceWhy: "the table keeps one number per square",
  },
  code: CODE,
  examples: [
    { label: '"abcde" and "ace"', input: 'text1="abcde", text2="ace"', expected: "3" },
    { label: '"cat" and "act"', input: 'text1="cat", text2="act"', expected: "2", note: "Shared letters in a different order" },
    { label: '"abc" and "abc"', input: 'text1="abc", text2="abc"', expected: "3" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-72", title: "Edit Distance" },
    { slug: "lc-300", title: "Longest Increasing Subsequence" },
    { slug: "lc-62", title: "Unique Paths" },
  ],
  answer: (raw) => String(solve(parseInput(raw)).table.at(-1)!.at(-1)!),
  frames: (raw) => {
    const words = parseInput(raw);
    const solved = solve(words);
    const slow = runSlow(words);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(words, solved),
      ...slowFrames(words, slow),
      ...insightFrames(words, solved),
      ...solutionFrames(words, solved, slow),
      ...practiceFrames(practice, solve(practice)),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remembered(words, solved),
      },
    ];
  },
  View: LcsTableView,
};
