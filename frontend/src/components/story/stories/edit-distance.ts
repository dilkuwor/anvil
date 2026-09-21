import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp3TableView, type Dp3AlignColumn, type Dp3Square, type Dp3TableState } from "../agy-dp3-table-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<Dp3TableState>;
type Words = { word1: string; word2: string };

/** Fresh words for the "your turn" run: a replace, a delete, and two matches (one for the trap). */
const PRACTICE = 'word1="bat", word2="at"';

const CODE = [
  "int m = word1.length(), n = word2.length();",
  "int[] prev = new int[n + 1], cur = new int[n + 1];",
  "for (int j = 0; j <= n; j++) prev[j] = j;",
  "for (int i = 1; i <= m; i++) {",
  "    cur[0] = i;",
  "    for (int j = 1; j <= n; j++) {",
  "        if (word1.charAt(i - 1) == word2.charAt(j - 1)) {",
  "            cur[j] = prev[j - 1];",
  "        } else {",
  "            cur[j] = 1 + Math.min(prev[j - 1], Math.min(prev[j], cur[j - 1]));",
  "        }",
  "    }",
  "    int[] swap = prev; prev = cur; cur = swap;",
  "}",
  "return prev[n];",
];

function parseInput(raw: string): Words {
  const quoted = [...raw.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  if (quoted.length < 2 || !quoted[0] || !quoted[1]) return { word1: "horse", word2: "ros" };
  return { word1: quoted[0].slice(0, 6), word2: quoted[1].slice(0, 7) };
}

/** Independent solver: the question asked from the back of the words, with every answer remembered. */
function fewestEdits({ word1, word2 }: Words): number {
  const known = new Map<string, number>();
  const ask = (i: number, j: number): number => {
    if (i === 0) return j;
    if (j === 0) return i;
    const key = `${i},${j}`;
    const old = known.get(key);
    if (old !== undefined) return old;
    const value = word1[i - 1] === word2[j - 1] ? ask(i - 1, j - 1) : 1 + Math.min(ask(i - 1, j - 1), ask(i - 1, j), ask(i, j - 1));
    known.set(key, value);
    return value;
  };
  return ask(word1.length, word2.length);
}

type Kind = "match" | "replace" | "delete" | "insert" | "tie";
type Step = { kind: "keep" | "replace" | "delete" | "insert"; top: number | null; bottom: number | null };
type Solved = { table: number[][]; path: Dp3Square[]; steps: Step[] };

/** The table the real algorithm builds, and the walk back from the corner that names the edits. */
function solve({ word1, word2 }: Words): Solved {
  const m = word1.length;
  const n = word2.length;
  const table = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      table[i][j] = word1[i - 1] === word2[j - 1] ? table[i - 1][j - 1] : 1 + Math.min(table[i - 1][j - 1], table[i - 1][j], table[i][j - 1]);
    }
  }
  const path: Dp3Square[] = [[m, n]];
  const steps: Step[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && word1[i - 1] === word2[j - 1]) steps.unshift({ kind: "keep", top: --i, bottom: --j });
    else if (i > 0 && j > 0 && table[i][j] === table[i - 1][j - 1] + 1) steps.unshift({ kind: "replace", top: --i, bottom: --j });
    else if (i > 0 && table[i][j] === table[i - 1][j] + 1) steps.unshift({ kind: "delete", top: --i, bottom: null });
    else steps.unshift({ kind: "insert", top: null, bottom: --j });
    path.push([i, j]);
  }
  return { table, path, steps };
}

function kindOf({ word1, word2 }: Words, table: number[][], [i, j]: Dp3Square): Kind {
  if (word1[i - 1] === word2[j - 1]) return "match";
  const options: [Kind, number][] = [
    ["replace", table[i - 1][j - 1]],
    ["delete", table[i - 1][j]],
    ["insert", table[i][j - 1]],
  ];
  const least = Math.min(...options.map(([, value]) => value));
  const cheapest = options.filter(([, value]) => value === least);
  return cheapest.length === 1 ? cheapest[0][0] : "tie";
}

function sourceOf(kind: Kind, [i, j]: Dp3Square): Dp3Square {
  if (kind === "delete") return [i - 1, j];
  if (kind === "insert") return [i, j - 1];
  return [i - 1, j - 1];
}

/** Every neighbour that holds the least (for a tie, more than one). */
function cheapestNeighbours(table: number[][], [i, j]: Dp3Square): Dp3Square[] {
  const around: Dp3Square[] = [
    [i - 1, j - 1],
    [i - 1, j],
    [i, j - 1],
  ];
  const least = Math.min(...around.map(([a, b]) => table[a][b]));
  return around.filter(([a, b]) => table[a][b] === least);
}

function blank({ word1, word2 }: Words, mode: Dp3TableState["mode"] = "table"): Dp3TableState {
  const rows = word1.length + 1;
  const columns = word2.length + 1;
  return {
    mode,
    align: [],
    rowLabels: ["(empty)", ...word1],
    columnLabels: ["(empty)", ...word2],
    rowTones: Array.from({ length: rows }, () => "idle" as CellTone),
    columnTones: Array.from({ length: columns }, () => "idle" as CellTone),
    cells: Array.from({ length: rows }, () => Array.from({ length: columns }, () => null)),
    tones: Array.from({ length: rows }, () => Array.from({ length: columns }, () => "idle" as CellTone)),
    tiles: null,
    marks: [],
    here: null,
    arrows: [],
    paths: [],
    outlines: [],
    badge: null,
    counter: null,
    answer: null,
    note: null,
  };
}

function lit(state: Dp3TableState, [i, j]: Dp3Square): Dp3TableState {
  const rowTones = [...state.rowTones];
  const columnTones = [...state.columnTones];
  rowTones[i] = "edge";
  columnTones[j] = "edge";
  return { ...state, rowTones, columnTones, here: [i, j] };
}

/** The two words, one above the other, with no edits marked. `atEnd` lines up their last letters instead of their first. */
function plainColumns({ word1, word2 }: Words, atEnd = false): Dp3AlignColumn[] {
  const length = Math.max(word1.length, word2.length);
  const shift = (word: string) => (atEnd ? length - word.length : 0);
  return Array.from({ length }, (_, index) => ({ top: word1[index - shift(word1)] ?? null, bottom: word2[index - shift(word2)] ?? null, label: "", tone: "idle" as CellTone }));
}

function scriptColumns({ word1, word2 }: Words, steps: Step[]): Dp3AlignColumn[] {
  return steps.map((step) => ({
    top: step.top === null ? null : word1[step.top],
    bottom: step.bottom === null ? null : word2[step.bottom],
    label: step.kind,
    tone: (step.kind === "keep" ? "done" : "edge") as CellTone,
  }));
}

function editWords({ word1, word2 }: Words, steps: Step[]): string[] {
  return steps
    .filter((step) => step.kind !== "keep")
    .map((step) => (step.kind === "replace" ? `replace '${word1[step.top!]}' by '${word2[step.bottom!]}'` : step.kind === "delete" ? `delete '${word1[step.top!]}'` : `insert '${word2[step.bottom!]}'`));
}

function listOf(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function pictureFrames(words: Words, solved: Solved): Frame[] {
  const { word1, word2 } = words;
  const m = word1.length;
  const n = word2.length;
  const distance = solved.table[m][n];
  const edits = editWords(words, solved.steps);
  const frames: Frame[] = [
    { scene: "picture", caption: `Two words: "${word1}" and "${word2}". We want to turn the first word into the second.`, state: { ...blank(words, "align"), align: plainColumns(words) } },
    {
      scene: "picture",
      caption: "One edit changes one letter. There are three kinds: replace a letter, delete a letter, or insert a letter. Each edit costs 1.",
      state: { ...blank(words, "align"), align: scriptColumns(words, solved.steps).map((column) => (column.label === "keep" ? { ...column, label: "", tone: "idle" as CellTone } : column)), note: { text: "replace · delete · insert: 1 edit each", tone: "accent" } },
    },
  ];
  if (solved.steps.some((step) => step.kind === "keep")) {
    frames.push({
      scene: "picture",
      caption: "A letter that is already right costs nothing. It is simply kept.",
      state: { ...blank(words, "align"), align: scriptColumns(words, solved.steps), note: { text: "keep: free", tone: "teal" } },
    });
  }
  if (m + n <= 9) {
    const clumsy: Dp3AlignColumn[] = [
      ...[...word1].map((letter) => ({ top: letter, bottom: null, label: "delete", tone: "miss" as CellTone })),
      ...[...word2].map((letter) => ({ top: null, bottom: letter, label: "insert", tone: "miss" as CellTone })),
    ];
    frames.push({
      scene: "picture",
      caption: `A clumsy way: delete all ${plural(m, "letter")}, then insert all ${n}. It works, but it costs ${m + n} edits.`,
      state: { ...blank(words, "align"), align: clumsy, note: { text: `✕ ${m + n} edits: far too many`, tone: "coral" } },
    });
  }
  frames.push({
    scene: "picture",
    caption:
      distance === 0
        ? "The goal: the fewest edits. These two words are already the same, so the answer will be 0."
        : edits.length <= 3
          ? `The goal: the fewest edits. Here ${distance} ${distance === 1 ? "is" : "are"} enough: ${listOf(edits)}.`
          : `The goal: the fewest edits. Here ${distance} are enough. Every other letter stays as it is.`,
    state: { ...blank(words, "align"), align: scriptColumns(words, solved.steps), answer: { label: "fewest edits", value: String(distance) } },
  });
  return frames;
}

type SlowRun = { calls: number; asked: number[][] };

/** Plain recursion, really run: on a mismatch it tries all three edits, and never remembers an answer. */
function runSlow({ word1, word2 }: Words): SlowRun {
  const run: SlowRun = { calls: 0, asked: Array.from({ length: word1.length + 1 }, () => Array.from({ length: word2.length + 1 }, () => 0)) };
  const helper = (i: number, j: number): number => {
    run.calls++;
    run.asked[i][j]++;
    if (i === 0) return j;
    if (j === 0) return i;
    if (word1[i - 1] === word2[j - 1]) return helper(i - 1, j - 1);
    return 1 + Math.min(helper(i, j - 1), helper(i - 1, j), helper(i - 1, j - 1));
  };
  helper(word1.length, word2.length);
  return run;
}

function slowFrames(words: Words, run: SlowRun): Frame[] {
  const { word1, word2 } = words;
  const m = word1.length;
  const n = word2.length;
  const same = word1[m - 1] === word2[n - 1];
  // Lined up at their ends, so the two last letters share the last column.
  const lastLit = plainColumns(words, true).map((column, index, all) => ({ ...column, tone: (index === all.length - 1 ? (same ? "done" : "miss") : "idle") as CellTone }));
  const counts = blank(words);
  counts.cells = run.asked.map((line) => [...line]);
  counts.tones = run.asked.map((line) => line.map((value) => (value > 1 ? "miss" : "idle") as CellTone));
  const different = run.asked.flat().filter((value) => value > 0).length;
  return [
    {
      scene: "slow",
      caption: `The slow way: look at the last letters, '${word1[m - 1]}' and '${word2[n - 1]}'. ${same ? "They match, so set both aside" : "They differ, so try all three edits"}, and start again on the shorter words each time.`,
      state: { ...blank(words, "align"), align: lastLit, counter: { label: "questions asked", value: 1 } },
    },
    {
      scene: "slow",
      caption: `Each square is one small question, such as "turn '${word1.slice(0, 1)}' into '${word2.slice(0, 1)}'". Its number shows how many times the slow way asked it.`,
      state: { ...counts, counter: { label: "questions asked", value: run.calls } },
    },
    {
      scene: "slow",
      caption: `${run.calls} questions asked, but only ${different} different ones. Every extra letter can triple the work. This is O(3^(m+n)) time.`,
      state: { ...counts, tones: counts.tones.map((line) => line.map(() => "faded" as CellTone)), counter: { label: "questions asked", value: run.calls } },
    },
  ];
}

function squaresOf({ word1, word2 }: Words): Dp3Square[] {
  const squares: Dp3Square[] = [];
  for (let i = 1; i <= word1.length; i++) for (let j = 1; j <= word2.length; j++) squares.push([i, j]);
  return squares;
}

/** The table as it looks just before `stop` is filled. The top row and the left column are always there. */
function tableUntil(table: number[][], stop: Dp3Square, include = false): (number | null)[][] {
  return table.map((line, i) =>
    line.map((value, j) => {
      if (i === 0 || j === 0) return value;
      const before = i < stop[0] || (i === stop[0] && (include ? j <= stop[1] : j < stop[1]));
      return before ? value : null;
    }),
  );
}

function insightFrames(words: Words, solved: Solved): Frame[] {
  const { word1, word2 } = words;
  const { table } = solved;
  const squares = squaresOf(words);
  const differ = squares.find((square) => kindOf(words, table, square) !== "match") ?? null;
  const match = squares.find((square) => kindOf(words, table, square) === "match") ?? null;
  const first = differ ?? match ?? [1, 1];
  const frames: Frame[] = [];
  const asked = lit(blank(words), first);
  for (let i = 1; i <= first[0]; i++) asked.rowTones[i] = "edge";
  for (let j = 1; j <= first[1]; j++) asked.columnTones[j] = "edge";
  frames.push({
    scene: "insight",
    caption: `Picture a table of small answers. This square asks a small question: what is the fewest edits to turn "${word1.slice(0, first[0])}" into "${word2.slice(0, first[1])}"?`,
    state: asked,
  });
  const edges = blank(words);
  edges.cells = table.map((line, i) => line.map((value, j) => (i === 0 || j === 0 ? value : null)));
  edges.tones = edges.tones.map((line, i) => line.map((tone, j) => (i === 0 || j === 0 ? "window" : tone)));
  frames.push({
    scene: "insight",
    caption: "The edges are easy. Turning a word into nothing means deleting every letter. Building a word from nothing means inserting every letter.",
    state: edges,
  });
  if (match) {
    const state = lit({ ...blank(words), cells: tableUntil(table, match, true) }, match);
    state.tones[match[0]][match[1]] = "done";
    frames.push({
      scene: "insight",
      caption: `Where the two letters match, like '${word1[match[0] - 1]}' here, no edit is needed. The square copies its diagonal neighbour, for free.`,
      state: { ...state, arrows: [{ from: [match[0] - 1, match[1] - 1], to: match }], badge: { text: "letters match: copy the diagonal, free", tone: "teal" } },
    });
  }
  if (differ) {
    const [i, j] = differ;
    const state = lit({ ...blank(words), cells: tableUntil(table, differ) }, differ);
    frames.push({
      scene: "insight",
      caption: "Where they differ, one edit is needed. Each neighbour stands for one kind: diagonal is replace, above is delete, left is insert. Take the cheapest neighbour and add 1.",
      state: { ...state, arrows: [{ from: [i - 1, j - 1], to: differ }, { from: [i - 1, j], to: differ }, { from: [i, j - 1], to: differ }], badge: { text: "letters differ: cheapest neighbour + 1", tone: "accent" } },
    });
  }
  return frames;
}

const flatten = ({ word2 }: Words, [i, j]: Dp3Square) => i * (word2.length + 1) + j;

const OTHERWISE = "That square does not touch the one we are filling. Look at its three filled neighbours: above, on the left, and on the diagonal between them.";
const WHERE: Record<"replace" | "delete" | "insert", string> = { replace: "on the diagonal", delete: "above", insert: "on the left" };

function buildQuiz(words: Words, table: number[][], square: Dp3Square, kind: Exclude<Kind, "tie">): StoryQuiz {
  const [i, j] = square;
  const cells = (words.word1.length + 1) * (words.word2.length + 1);
  const feedback: Record<number, string> = { [flatten(words, square)]: "That is the square we are filling. It gets its number from one that is already filled." };
  if (kind === "match") {
    feedback[flatten(words, [i - 1, j])] = "Building on the square above means deleting a letter, which costs an edit. A match needs no edit at all.";
    feedback[flatten(words, [i, j - 1])] = "Building on the square on the left means inserting a letter, which costs an edit. A match needs no edit at all.";
    return {
      kind: "cell",
      cells,
      question: "The two letters match. Which square does this one copy? Click it.",
      answer: flatten(words, [i - 1, j - 1]),
      feedback,
      otherwise: OTHERWISE,
      why: "The diagonal square is the cost before either of these letters. A match adds nothing to it.",
    };
  }
  const source = sourceOf(kind, square);
  for (const other of [[i - 1, j - 1], [i - 1, j], [i, j - 1]] as Dp3Square[]) {
    if (other[0] === source[0] && other[1] === source[1]) continue;
    feedback[flatten(words, other)] = `That neighbour holds ${table[other[0]][other[1]]}. Another one is cheaper, and we want the fewest edits.`;
  }
  return {
    kind: "cell",
    cells,
    question: "The letters differ, so one edit is needed. Which neighbour is the cheapest to build on? Click it.",
    answer: flatten(words, source),
    feedback,
    otherwise: OTHERWISE,
    why: `The neighbour ${WHERE[kind]} holds ${table[source[0]][source[1]]}, the least of the three. Building on it means one ${kind}.`,
  };
}

function editSentence({ word1, word2 }: Words, kind: "replace" | "delete" | "insert", [i, j]: Dp3Square) {
  if (kind === "replace") return `replace '${word1[i - 1]}' by '${word2[j - 1]}'`;
  if (kind === "delete") return `delete '${word1[i - 1]}'`;
  return `insert '${word2[j - 1]}'`;
}

const DIFFER_BADGE = { text: "letters differ: cheapest neighbour + 1", tone: "accent" as const };
const MATCH_BADGE = { text: "letters match: copy the diagonal, free", tone: "teal" as const };

/** The real algorithm, square by square. The first square of each kind is told in full; after that, runs with no match are summed up. */
function solutionFrames(words: Words, solved: Solved, slow: SlowRun): Frame[] {
  const { word1, word2 } = words;
  const { table } = solved;
  const m = word1.length;
  const n = word2.length;
  const frames: Frame[] = [];
  const cells: (number | null)[][] = table.map((line) => line.map(() => null));
  /** Rows the two rolling rows have already let go. */
  let fadedBelow = 0;
  const base = (): Dp3TableState => {
    const state = blank(words);
    state.cells = cells.map((line) => [...line]);
    state.tones = state.tones.map((line, i) => line.map((tone) => (i < fadedBelow ? "faded" : tone)));
    return state;
  };
  const seen = new Set<Kind>();
  let askedDiffer = false;
  let toldTwoRows = false;
  let trapShown = false;

  frames.push({
    scene: "solution",
    caption: `Draw the table: one row for each letter of "${word1}", one column for each letter of "${word2}", plus a row and a column for the empty word.`,
    codeLine: 1,
    state: base(),
  });
  for (let j = 0; j <= n; j++) cells[0][j] = j;
  const topRow = base();
  topRow.tones[0] = topRow.tones[0].map(() => "window");
  frames.push({
    scene: "solution",
    caption: `The top row builds "${word2}" from nothing, one insert per letter. So its squares hold ${table[0].join(", ")}.`,
    codeLine: 2,
    state: topRow,
  });

  for (let i = 1; i <= m; i++) {
    if (i >= 2) fadedBelow = i - 1;
    cells[i][0] = i;
    const start = lit(base(), [i, 0]);
    start.tones[i][0] = "window";
    frames.push({
      scene: "solution",
      caption:
        i === 1
          ? `Row '${word1[0]}'. Its first square turns "${word1.slice(0, 1)}" into nothing: delete 1 letter. It holds 1.`
          : `Row '${word1[i - 1]}' starts. Its first square turns "${word1.slice(0, i)}" into nothing: delete ${i} letters. It holds ${i}.`,
      codeLine: 4,
      state: start,
    });

    let group: Dp3Square[] = [];
    const flush = () => {
      if (group.length === 0) return;
      const last = group.at(-1)!;
      const state = lit(base(), last);
      for (const [a, b] of group) state.tones[a][b] = "hit";
      const values = group.map(([a, b]) => String(table[a][b]));
      frames.push({
        scene: "solution",
        caption:
          group.length === 1
            ? `Next square: '${word1[i - 1]}' and '${word2[last[1] - 1]}' differ, so it takes its cheapest neighbour plus 1: ${values[0]}.`
            : `The next ${group.length} squares of row '${word1[i - 1]}' have no match. Each takes its cheapest neighbour plus 1: ${values.join(", ")}.`,
        codeLine: 9,
        state: { ...state, badge: DIFFER_BADGE },
      });
      group = [];
    };

    for (let j = 1; j <= n; j++) {
      const square: Dp3Square = [i, j];
      const kind = kindOf(words, table, square);
      const value = table[i][j];
      const meet = `Row '${word1[i - 1]}' meets column '${word2[j - 1]}'`;
      const isNew = !seen.has(kind);
      seen.add(kind);

      if (kind !== "match" && !isNew) {
        cells[i][j] = value;
        group.push(square);
        continue;
      }
      flush();

      if (kind === "match") {
        const diagonal = table[i - 1][j - 1];
        if (isNew) {
          frames.push({ scene: "solution", caption: `${meet}: the two letters match.`, codeLine: 6, state: { ...lit(base(), square), badge: { text: "letters match", tone: "teal" } }, quiz: buildQuiz(words, table, square, "match") });
        }
        cells[i][j] = value;
        const state = lit(base(), square);
        state.tones[i][j] = "done";
        frames.push({
          scene: "solution",
          caption: isNew
            ? `Copy the diagonal neighbour, which holds ${diagonal}. The '${word1[i - 1]}' is already right, so no edit is added. This square holds ${value}.`
            : `${meet}: a match. Copy the diagonal neighbour for free: this square holds ${value}.`,
          codeLine: 7,
          state: { ...state, arrows: [{ from: [i - 1, j - 1], to: square }], badge: MATCH_BADGE },
        });
        if (!trapShown) {
          trapShown = true;
          const wrong = lit(base(), square);
          wrong.cells[i][j] = diagonal + 1;
          wrong.tones[i][j] = "miss";
          frames.push({
            scene: "solution",
            caption: `The Free Match Trap: adding 1 here would charge an edit for a letter that is already right. This square would hold ${diagonal + 1} instead of ${value}, and later squares build on it.`,
            codeLine: 7,
            state: { ...wrong, arrows: [{ from: [i - 1, j - 1], to: square }], badge: { text: `✕ a match costs nothing: ${value}, not ${diagonal + 1}`, tone: "coral" } },
          });
        }
        continue;
      }

      // The first square of this kind: replace, delete, insert, or a tie between neighbours.
      if (kind !== "tie" && !askedDiffer) {
        askedDiffer = true;
        frames.push({ scene: "solution", caption: `${meet}: the letters differ.`, codeLine: 6, state: { ...lit(base(), square), badge: { text: "letters differ", tone: "accent" } }, quiz: buildQuiz(words, table, square, kind) });
      }
      cells[i][j] = value;
      const state = lit(base(), square);
      state.tones[i][j] = "hit";
      const least = value - 1;
      frames.push({
        scene: "solution",
        caption:
          kind === "tie"
            ? `${meet}: they differ. Two neighbours tie for cheapest, with ${least}. Either way, this square holds ${least} + 1 = ${value}.`
            : `${meet}: they differ. The cheapest neighbour is the one ${WHERE[kind]}, with ${least}. So ${editSentence(words, kind, square)}: ${least} + 1 = ${value}.`,
        codeLine: 9,
        state: { ...state, arrows: cheapestNeighbours(table, square).map((from) => ({ from, to: square })), badge: DIFFER_BADGE },
      });
    }
    flush();
    if (!toldTwoRows && m > 1) {
      toldTwoRows = true;
      fadedBelow = 1;
      frames.push({
        scene: "solution",
        caption: `Row '${word1[0]}' is full. A square only looks at its own row and the row above, so the code keeps just two rows of numbers. Older rows fade.`,
        codeLine: 12,
        state: { ...base(), badge: { text: "two rows of numbers are enough", tone: "accent" } },
      });
    }
  }

  const answer = table[m][n];
  const answerLabel = { label: "fewest edits", value: String(answer) };
  const corner = base();
  corner.tones[m][n] = "done";
  frames.push({
    scene: "solution",
    caption: `The table is full. The corner square turned all of "${word1}" into all of "${word2}", and it holds ${answer}. The answer is ${answer}.`,
    codeLine: 14,
    state: { ...corner, here: [m, n], answer: answerLabel },
  });
  if (answer > 0) {
    frames.push({
      scene: "solution",
      caption: "To see the edits themselves, keep the whole table and walk back from the corner. A diagonal step is a replace or a free match, up is a delete, left is an insert.",
      codeLine: 14,
      state: remembered(words, solved),
    });
    const edits = editWords(words, solved.steps);
    frames.push({
      scene: "solution",
      caption: edits.length <= 3 ? `Read along the path: ${listOf(edits)}. That is ${plural(answer, "edit")}.` : `Read along the path, column by column. Every marked column is one edit: ${answer} in all.`,
      codeLine: 14,
      state: { ...blank(words, "align"), align: scriptColumns(words, solved.steps), answer: answerLabel },
    });
  }
  fadedBelow = 0;
  const full = base();
  full.tones[m][n] = "done";
  frames.push({
    scene: "solution",
    caption: `Time: O(m · n). Each of the ${m * n} inner squares was filled once, by looking at 3 neighbours at most.${slow.calls > m * n ? ` The slow way asked ${slow.calls} questions.` : ""}`,
    codeLine: 5,
    state: { ...full, answer: answerLabel, counter: { label: "squares filled", value: m * n } },
  });
  const kept = base();
  kept.tones = kept.tones.map((line, i) => line.map(() => (i >= m - 1 ? "window" : "faded") as CellTone));
  frames.push({
    scene: "solution",
    caption: `Space: O(n). The code keeps only two rows at a time: the row being filled and the row above. Each row holds ${n + 1} numbers.`,
    codeLine: 1,
    state: { ...kept, answer: answerLabel },
  });
  return frames;
}

/** The full table with the walk back from the corner. */
function remembered(words: Words, solved: Solved): Dp3TableState {
  const m = words.word1.length;
  const n = words.word2.length;
  const state = { ...blank(words), cells: solved.table.map((line) => [...line]) };
  state.tones[m][n] = "done";
  for (const step of solved.steps) {
    if (step.kind !== "keep" || step.top === null || step.bottom === null) continue;
    state.rowTones[step.top + 1] = "done";
    state.columnTones[step.bottom + 1] = "done";
  }
  return { ...state, paths: [{ squares: solved.path, tone: "teal", arrow: false }], answer: { label: "fewest edits", value: String(solved.table[m][n]) } };
}

/** The "your turn" run: the reader fills the edges, then picks the neighbour of every square that has one right answer. */
function practiceFrames(words: Words, solved: Solved): Frame[] {
  const { word1, word2 } = words;
  const { table } = solved;
  const m = word1.length;
  const n = word2.length;
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  const cells: (number | null)[][] = table.map((line) => line.map(() => null));
  const base = (): Dp3TableState => ({ ...blank(words), cells: cells.map((line) => [...line]) });
  const count = (upTo: number) => Array.from({ length: upTo + 1 }, (_, index) => index).join(", ");

  frames.push({
    scene,
    caption: `Your turn, on two new words: turn "${word1}" into "${word2}". You make every choice, starting with the edges of the table.`,
    state: base(),
    quiz: {
      kind: "choice",
      question: `The top row builds "${word2}" from nothing. What does it hold?`,
      options: [Array.from({ length: n + 1 }, () => 0).join(", "), count(n), Array.from({ length: n + 1 }, () => 1).join(", ")],
      answer: 1,
      why: "Building a word from nothing takes one insert per letter. Only the very first square, nothing into nothing, is 0.",
    },
  });
  for (let j = 0; j <= n; j++) cells[0][j] = j;
  for (let i = 0; i <= m; i++) cells[i][0] = i;
  const edges = base();
  edges.tones = edges.tones.map((line, i) => line.map((tone, j) => (i === 0 || j === 0 ? "window" : tone)));
  frames.push({ scene, caption: `The top row counts inserts: ${count(n)}. The left column counts deletes: ${count(m)}.`, state: edges });

  let matches = 0;
  let group: Dp3Square[] = [];
  const flush = () => {
    if (group.length === 0) return;
    const last = group.at(-1)!;
    const state = lit(base(), last);
    for (const [a, b] of group) state.tones[a][b] = "hit";
    const values = group.map(([a, b]) => String(table[a][b]));
    frames.push({
      scene,
      caption:
        group.length === 1
          ? `Next square: '${word1[last[0] - 1]}' and '${word2[last[1] - 1]}' differ, and two neighbours tie for cheapest. Nothing to choose: it holds ${values[0]}.`
          : `The next ${group.length} squares have no match, and their cheapest neighbours tie. Nothing to choose: they hold ${values.join(", ")}.`,
      state,
    });
    group = [];
  };

  for (const square of squaresOf(words)) {
    const [i, j] = square;
    const kind = kindOf(words, table, square);
    const value = table[i][j];
    if (kind === "tie") {
      cells[i][j] = value;
      group.push(square);
      continue;
    }
    flush();
    const meet = `Row '${word1[i - 1]}' meets column '${word2[j - 1]}'.`;
    if (kind === "match") matches++;
    if (kind === "match" && matches >= 2) {
      const diagonal = table[i - 1][j - 1];
      frames.push({
        scene,
        caption: `${meet} The letters match, and the diagonal neighbour holds ${diagonal}.`,
        state: { ...lit(base(), square), arrows: [{ from: [i - 1, j - 1], to: square }] },
        quiz: {
          kind: "choice",
          question: "What goes in this square?",
          options: [String(diagonal), String(diagonal + 1)],
          answer: 0,
          why: "A letter that is already right needs no edit. Adding 1 for a match is the Free Match Trap.",
        },
      });
    } else {
      frames.push({ scene, caption: meet, state: lit(base(), square), quiz: buildQuiz(words, table, square, kind) });
    }
    cells[i][j] = value;
    const state = lit(base(), square);
    state.tones[i][j] = kind === "match" ? "done" : "hit";
    frames.push({
      scene,
      caption:
        kind === "match"
          ? `The letters match, so copy the diagonal neighbour for free: ${value}.`
          : `The letters differ. The cheapest neighbour is the one ${WHERE[kind]}, with ${value - 1}. So ${editSentence(words, kind, square)}: ${value - 1} + 1 = ${value}.`,
      state: { ...state, arrows: [{ from: sourceOf(kind, square), to: square }], badge: kind === "match" ? MATCH_BADGE : DIFFER_BADGE },
    });
  }
  flush();

  const answer = table[m][n];
  const edits = editWords(words, solved.steps);
  frames.push({
    scene,
    caption: `Done. The corner holds ${answer}, so the answer is ${answer}.${edits.length > 0 && edits.length <= 2 ? ` The path back says: ${listOf(edits)}.` : ""}`,
    state: remembered(words, solved),
  });
  return frames;
}

export const editDistanceStory: ProblemStory<Dp3TableState> = {
  slugs: ["lc-72"],
  pattern: "2-D DP",
  trigger: "the fewest inserts, deletes and replaces to turn one word into another",
  insight: "A table of small answers: each square is the fewest edits to turn the first i letters into the first j. Letters match: copy the diagonal, for free. Letters differ: cheapest of diagonal (replace), above (delete), left (insert), plus 1.",
  metaphor: {
    name: "The cheapest neighbour",
    legend: "square = cur[j] · diagonal = prev[j - 1] (replace, or a free match) · above = prev[j] (delete) · left = cur[j - 1] (insert) · corner = prev[n] at the end",
    terms: ["square", "neighbour", "diagonal", "corner", "row", "path"],
  },
  traps: [{ name: "The Free Match Trap", rule: "A letter that already matches costs no edit. On a match copy the diagonal as it is, prev[j - 1], with no + 1." }],
  template: [
    "top row = 0..n;  left column = 0..m;      // build from nothing, delete to nothing",
    "for (i = 1..m) for (j = 1..n)",
    "    if (a[i - 1] matches b[j - 1]) table[i][j] = table[i - 1][j - 1];           // free",
    "    else table[i][j] = 1 + cheapest of diagonal, above, left;",
    "return table[m][n];",
  ],
  complexity: {
    slow: "O(3^(m+n))",
    time: "O(m · n)",
    timeWhy: "every square of the table is filled once, from three neighbours",
    space: "O(n)",
    spaceWhy: "a square only looks at its own row and the row above, so two rows of n + 1 numbers are kept",
  },
  code: CODE,
  examples: [
    { label: '"horse" into "ros"', input: 'word1="horse", word2="ros"', expected: "3" },
    { label: '"sea" into "eat"', input: 'word1="sea", word2="eat"', expected: "2", note: "One delete and one insert" },
    { label: '"cat" into "cut"', input: 'word1="cat", word2="cut"', expected: "1", note: "A single replace" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-1143", title: "Longest Common Subsequence" },
    { slug: "lc-62", title: "Unique Paths" },
    { slug: "lc-221", title: "Maximal Square" },
  ],
  answer: (raw) => String(fewestEdits(parseInput(raw))),
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
  View: AgyDp3TableView,
};
