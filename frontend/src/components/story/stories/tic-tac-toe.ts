import type { CellTone } from "@/components/learn/viz/primitives";

import { TicTacToeView, fmtRope, lineCells, ropeIndex, ropeValue, sameLine, type LineId, type Ropes, type TicTacToeState } from "../tic-tac-toe-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TicTacToeState>;
type Move = { row: number; col: number; player: 1 | 2 };
type Input = { n: number; moves: Move[] };

/** Fresh game for "your turn": row 0 fills up with marks from both players (the trap), then O wins on the ↗ diagonal. */
const PRACTICE = '["TicTacToe","move","move","move","move","move"]\n[[3],[0,2,2],[0,0,1],[1,1,2],[0,1,1],[2,0,2]]';

const CODE = [
  "class TicTacToe {",
  "    private final int n;",
  "    private final int[] rows;",
  "    private final int[] cols;",
  "    private int diagonal;",
  "    private int antiDiagonal;",
  "    public TicTacToe(int n) {",
  "        this.n = n;",
  "        this.rows = new int[n];",
  "        this.cols = new int[n];",
  "    }",
  "    public int move(int row, int col, int player) {",
  "        int add = player == 1 ? 1 : -1;",
  "        rows[row] += add;",
  "        cols[col] += add;",
  "        if (row == col) diagonal += add;",
  "        if (row + col == n - 1) antiDiagonal += add;",
  "        if (Math.abs(rows[row]) == n || Math.abs(cols[col]) == n",
  "                || Math.abs(diagonal) == n || Math.abs(antiDiagonal) == n) {",
  "            return player;",
  "        }",
  "        return 0;",
  "    }",
  "}",
];

const lineOf = (text: string) => CODE.findIndex((line) => line.includes(text));
const LINE = {
  ropes: lineOf("this.rows = new int[n]"),
  add: lineOf("int add ="),
  row: lineOf("rows[row] += add"),
  diag: lineOf("row == col"),
  anti: lineOf("antiDiagonal += add"),
  check: lineOf("Math.abs(rows[row])"),
  win: lineOf("return player"),
  none: lineOf("return 0"),
};

function parseInput(raw: string): Input {
  try {
    const [opsText, argsText] = raw.trim().split(/\n/);
    const ops = JSON.parse(opsText) as string[];
    const args = JSON.parse(argsText) as number[][];
    let n = 3;
    const moves: Move[] = [];
    ops.forEach((op, i) => {
      if (op === "TicTacToe") n = args[i]?.[0] ?? 3;
      else if (op === "move") moves.push({ row: args[i][0], col: args[i][1], player: args[i][2] === 2 ? 2 : 1 });
    });
    return { n, moves };
  } catch {
    return { n: 3, moves: [] };
  }
}

const show = (results: number[]) => `[${results.join(",")}]`;
const mark = (player: number) => (player === 1 ? "X" : "O");
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function lineName(line: LineId): string {
  if (line.kind === "row") return `row ${line.index}`;
  if (line.kind === "col") return `column ${line.index}`;
  return line.kind === "diag" ? "the ↘ diagonal" : "the ↗ diagonal";
}

/** The lines a mark at (row, col) lies on: its row, its column, and any diagonal through it. */
function linesThrough(n: number, row: number, col: number): LineId[] {
  const lines: LineId[] = [
    { kind: "row", index: row },
    { kind: "col", index: col },
  ];
  if (row === col) lines.push({ kind: "diag", index: 0 });
  if (row + col === n - 1) lines.push({ kind: "anti", index: 0 });
  return lines;
}

const emptyBoard = (n: number) => Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
const copyBoard = (board: number[][]) => board.map((row) => [...row]);
const emptyRopes = (n: number): Ropes => ({ rows: Array.from({ length: n }, () => 0), cols: Array.from({ length: n }, () => 0), diag: 0, anti: 0 });
const copyRopes = (ropes: Ropes): Ropes => ({ ...ropes, rows: [...ropes.rows], cols: [...ropes.cols] });

const marksOn = (board: number[][], n: number, line: LineId) => lineCells(n, line).filter(([r, c]) => board[r][c] !== 0).length;
/** Every cell marked, but not all by one player. A plain count would call this a win. */
function mixedFull(board: number[][], n: number, line: LineId): boolean {
  const players = new Set(lineCells(n, line).map(([r, c]) => board[r][c]));
  return !players.has(0) && players.size > 1;
}

/** Independent solver: the whole board, read line by line. Also counts what the slow way reads. */
function simulate({ n, moves }: Input): { results: number[]; reads: number } {
  const board = emptyBoard(n);
  let reads = 0;
  const results = moves.map(({ row, col, player }) => {
    board[row][col] = player;
    let rowFull = true;
    let colFull = true;
    let diagFull = true;
    let antiFull = true;
    for (let i = 0; i < n; i++) {
      if (board[row][i] !== player) rowFull = false;
      if (board[i][col] !== player) colFull = false;
      if (board[i][i] !== player) diagFull = false;
      if (board[i][n - 1 - i] !== player) antiFull = false;
      reads += 4;
    }
    return rowFull || colFull || diagFull || antiFull ? player : 0;
  });
  return { results, reads };
}

/** The lines through (row, col) that are all one player's, on this board. */
function fullLinesThrough(board: number[][], n: number, row: number, col: number): LineId[] {
  const player = board[row][col];
  return linesThrough(n, row, col).filter((line) => lineCells(n, line).every(([r, c]) => board[r][c] === player));
}

function blank(n: number): TicTacToeState {
  return { n, board: emptyBoard(n), ropes: null, lines: [], focus: null, plainCount: null, move: null, answers: null, counter: null, boardFaded: false, ropeTone: null };
}

const header = (k: number, total: number, move: Move) => `move ${k} of ${total}: ${mark(move.player)} at row ${move.row}, column ${move.col}`;

/** The first move that fills a line with marks from both players, if any. */
function firstMixedFull({ n, moves }: Input): { k: number; line: LineId; board: number[][] } | null {
  const board = emptyBoard(n);
  for (const [i, move] of moves.entries()) {
    board[move.row][move.col] = move.player;
    const line = linesThrough(n, move.row, move.col).find((candidate) => mixedFull(board, n, candidate));
    if (line) return { k: i + 1, line, board: copyBoard(board) };
  }
  return null;
}

function pictureFrames(input: Input, results: number[]): Frame[] {
  const { n, moves } = input;
  const total = moves.length;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `A tic-tac-toe board with ${n} rows and ${n} columns. X is player 1 and O is player 2. Each move marks one empty cell.`,
      state: blank(n),
    },
  ];
  const shown = Math.min(2, total);
  if (shown > 0) {
    const board = emptyBoard(n);
    const told = moves.slice(0, shown).map((move, i) => {
      board[move.row][move.col] = move.player;
      return `move ${i + 1} puts ${mark(move.player)} at row ${move.row}, column ${move.col}`;
    });
    frames.push({
      scene: "picture",
      caption: `Allowed: any empty cell. ${cap(told.join(", then "))}. Answers so far: ${show(results.slice(0, shown))}.`,
      state: { ...blank(n), board, move: header(shown, total, moves[shown - 1]), answers: results.slice(0, shown), focus: { row: moves[shown - 1].row, col: moves[shown - 1].col } },
    });
  }
  const mixed = firstMixedFull(input);
  if (mixed) {
    frames.push({
      scene: "picture",
      caption: `Not a win: ${lineName(mixed.line)} holds ${n} marks, but from both players. A line counts only when every mark in it belongs to one player.`,
      state: { ...blank(n), board: mixed.board, lines: [{ line: mixed.line, tone: "miss" }], move: header(mixed.k, total, moves[mixed.k - 1]), answers: results.slice(0, mixed.k) },
    });
  }
  const board = emptyBoard(n);
  for (const move of moves) board[move.row][move.col] = move.player;
  const last = moves.at(-1);
  const wins = last ? fullLinesThrough(board, n, last.row, last.col) : [];
  frames.push({
    scene: "picture",
    caption: `The goal: after each move answer 0, or the player's number if that move completes a row, column or diagonal. ${
      last && wins.length > 0 ? `Here move ${total} completes ${lineName(wins[0])} for ${mark(last.player)}.` : "Here nobody wins, so every answer is 0."
    }`,
    state: { ...blank(n), board, lines: wins.map((line) => ({ line, tone: "done" as CellTone })), move: last ? header(total, total, last) : null, answers: [...results] },
  });
  return frames;
}

function slowFrames({ n, moves }: Input): Frame[] {
  const frames: Frame[] = [];
  const board = emptyBoard(n);
  const total = moves.length;
  let reads = 0;
  const allFour = (move: Move): LineId[] => [{ kind: "row", index: move.row }, { kind: "col", index: move.col }, { kind: "diag", index: 0 }, { kind: "anti", index: 0 }];
  moves.forEach((move, i) => {
    const k = i + 1;
    board[move.row][move.col] = move.player;
    let readNow = 0;
    for (let j = 0; j < n; j++) readNow += 4;
    reads += readNow;
    const wins = fullLinesThrough(board, n, move.row, move.col);
    const state: TicTacToeState = {
      ...blank(n),
      board: copyBoard(board),
      focus: { row: move.row, col: move.col },
      move: header(k, total, move),
      lines: allFour(move).map((line) => ({ line, tone: "window" as CellTone })),
      counter: { label: "cells read", value: reads },
    };
    if (k <= 2 && k < total) {
      frames.push({
        scene: "slow",
        caption:
          k === 1
            ? `The slow way: keep the whole board. After each mark, read its whole row, its whole column and both diagonals to see if one is full: ${readNow} cells read.`
            : `Same for the next mark: read its row, its column and both diagonals again. ${readNow} more cells, ${reads} so far.`,
        state,
      });
    }
    if (k === total) {
      frames.push({
        scene: "slow",
        caption:
          wins.length > 0
            ? `The last mark is read the same way: ${lineName(wins[0])} is all ${mark(move.player)}, so this move answers ${move.player}. Right answer, but ${reads} cells read in all.`
            : `The last mark is read the same way. No line is full, so every answer is 0, after ${reads} cells read in all.`,
        state: { ...state, lines: [...state.lines, ...wins.map((line) => ({ line, tone: "done" as CellTone }))] },
      });
    }
  });
  frames.push({
    scene: "slow",
    caption: `Every move reads 4 lines of ${n} cells, and a bigger board means longer lines. That is O(n) time per move, and the whole board must be stored: O(n²) space.`,
    state: { ...blank(n), board: copyBoard(board), boardFaded: true, counter: { label: "cells read", value: reads } },
  });
  return frames;
}

/** The first move that pulls a rope the other player already pulled: the moment the sign matters. */
function firstShared({ n, moves }: Input): { k: number; line: LineId; board: number[][]; ropes: Ropes } | null {
  const board = emptyBoard(n);
  const ropes = emptyRopes(n);
  for (const [i, move] of moves.entries()) {
    const lines = linesThrough(n, move.row, move.col);
    const shared = lines.find((line) => lineCells(n, line).some(([r, c]) => board[r][c] !== 0 && board[r][c] !== move.player));
    board[move.row][move.col] = move.player;
    pull(ropes, n, move);
    if (shared) return { k: i + 1, line: shared, board: copyBoard(board), ropes: copyRopes(ropes) };
  }
  return null;
}

/** Moves every rope through the cell one step toward the player. Returns the ropes it pulled. */
function pull(ropes: Ropes, n: number, move: Move): LineId[] {
  const add = move.player === 1 ? 1 : -1;
  const lines = linesThrough(n, move.row, move.col);
  for (const line of lines) {
    if (line.kind === "row") ropes.rows[line.index] += add;
    else if (line.kind === "col") ropes.cols[line.index] += add;
    else if (line.kind === "diag") ropes.diag += add;
    else ropes.anti += add;
  }
  return lines;
}

function insightFrames(input: Input): Frame[] {
  const { n, moves } = input;
  if (moves.length === 0) return [];
  const first = moves[0];
  const board = emptyBoard(n);
  board[first.row][first.col] = first.player;
  const ropes = emptyRopes(n);
  const lines = pull(ropes, n, first);
  const base: TicTacToeState = { ...blank(n), board, ropes: copyRopes(ropes), move: header(1, moves.length, first) };
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Picture every row, column and diagonal as a rope in a tug-of-war. X pulls a rope one step to the right, O pulls it one step to the left.",
      state: base,
    },
    {
      scene: "insight",
      caption: `A mark pulls only the ropes it lies on: its row, its column and any diagonal through it. ${mark(first.player)} at row ${first.row}, column ${first.col} pulls ${lines.length} ropes; the other ${2 * n + 2 - lines.length} do not move.`,
      state: { ...base, focus: { row: first.row, col: first.col }, lines: lines.map((line) => ({ line, tone: "window" as CellTone })) },
    },
  ];
  const shared = firstShared(input);
  if (shared) {
    const value = ropeValue(shared.ropes, shared.line);
    frames.push({
      scene: "insight",
      caption: `When both players pull the same rope, it comes back toward the middle. ${cap(lineName(shared.line))} reads ${fmtRope(value)} after ${marksOn(shared.board, n, shared.line)} marks. Only a rope at the end, ${n} steps one way, is a win.`,
      state: { ...blank(n), board: shared.board, ropes: shared.ropes, move: header(shared.k, moves.length, moves[shared.k - 1]), lines: [{ line: shared.line, tone: "window" }] },
    });
  } else {
    frames.push({
      scene: "insight",
      caption: `A rope is a win only when it reaches the end: ${n} steps one way, all pulled by the same player.`,
      state: base,
    });
  }
  return frames;
}

function diagQuiz(n: number, move: Move): StoryQuiz {
  const onDiag = move.row === move.col;
  const onAnti = move.row + move.col === n - 1;
  const why = onDiag && onAnti
    ? `Row equals column, and row plus column is ${n - 1}: this cell is on both diagonals.`
    : onDiag
      ? "Row equals column, so this cell is on the ↘ diagonal."
      : onAnti
        ? `Row plus column is ${n - 1}, so this cell is on the ↗ diagonal.`
        : `Row is not equal to column, and row plus column is not ${n - 1}: no diagonal goes through this cell.`;
  return {
    kind: "choice",
    question: `Besides row ${move.row} and column ${move.col}, which diagonal rope does this mark pull?`,
    options: ["No diagonal", "The ↘ diagonal", "The ↗ diagonal", "Both diagonals"],
    answer: onDiag && onAnti ? 3 : onDiag ? 1 : onAnti ? 2 : 0,
    why,
  };
}

const directionQuiz: StoryQuiz = {
  kind: "choice",
  question: "O marks a cell. Which way does O pull its ropes?",
  options: ["Right, +1, the same as X", "Left, −1, the opposite of X"],
  answer: 1,
  why: "Each player pulls its own way. That is why a rope with both players on it stays near the middle instead of reaching the end.",
};

function winQuiz(n: number, wins: LineId[], ropes: Ropes, player: number, full: LineId | null): StoryQuiz {
  const won = wins.length > 0;
  return {
    kind: "choice",
    question: full && !won ? `${cap(lineName(full))} now holds ${n} marks. Does that win the game?` : "Does one of the pulled ropes reach the end now?",
    options: ["No, nobody wins yet", "Yes, X wins", "Yes, O wins"],
    answer: won ? player : 0,
    why: won
      ? `${cap(lineName(wins[0]))} reads ${fmtRope(ropeValue(ropes, wins[0]))}: ${n} steps one way, so ${mark(player)} wins.`
      : full
        ? `Marks from both players pull opposite ways, so ${lineName(full)} reads ${fmtRope(ropeValue(ropes, full))}, not ${n}. A full but mixed line is never a win.`
        : `No pulled rope reads ${n} or −${n}, so nobody wins yet.`,
  };
}

/** Before the pull: which rope is about to reach the end? Asked only when exactly one will. */
function endQuiz(n: number, move: Move, ropes: Ropes, winner: LineId): StoryQuiz {
  const feedback: Record<number, string> = {};
  const through = linesThrough(n, move.row, move.col);
  const all: LineId[] = [
    ...ropes.rows.map((_, i) => ({ kind: "row", index: i }) as LineId),
    ...ropes.cols.map((_, i) => ({ kind: "col", index: i }) as LineId),
    { kind: "diag", index: 0 },
    { kind: "anti", index: 0 },
  ];
  for (const line of all) {
    if (sameLine(line, winner)) continue;
    feedback[ropeIndex(n, line)] = through.some((candidate) => sameLine(candidate, line))
      ? `That rope reads ${fmtRope(ropeValue(ropes, line))} now. One more pull does not bring it to ${n} steps.`
      : "This mark is not on that rope, so that rope does not move at all.";
  }
  return {
    kind: "cell",
    cells: 2 * n + 2,
    question: `${mark(move.player)} marks row ${move.row}, column ${move.col}. One rope is about to reach the end. Click that rope.`,
    answer: ropeIndex(n, winner),
    feedback,
    otherwise: "Only the ropes through this mark move. Which of them is one step from the end?",
    why: `${cap(lineName(winner))} was at ${fmtRope(ropeValue(ropes, winner))}. One more pull by ${mark(move.player)} makes it ${n} steps: the whole rope.`,
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on a fresh game,
 * where the reader names the diagonal and calls the win every time.
 */
function solutionFrames(input: Input, scene: SceneId, practice: boolean, slowReads: number): Frame[] {
  const { n, moves } = input;
  const total = moves.length;
  const frames: Frame[] = [];
  const board = emptyBoard(n);
  const ropes = emptyRopes(n);
  const results: number[] = [];
  let pulls = 0;
  let askedDiag = false;
  let askedDirection = false;
  let askedEnd = false;
  let shownTrap = false;
  const codeLine = (index: number) => (practice ? undefined : index);
  const snap = (move: Move | null, k: number, extra: Partial<TicTacToeState> = {}): TicTacToeState => ({
    ...blank(n),
    board: copyBoard(board),
    ropes: copyRopes(ropes),
    answers: [...results],
    move: move ? header(k, total, move) : null,
    focus: move ? { row: move.row, col: move.col } : null,
    ...extra,
  });
  const lit = (lines: LineId[], tone: CellTone) => lines.map((line) => ({ line, tone }));

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new game: ${n} by ${n}, ${total} moves. For each move, say which diagonal it pulls, and whether a rope reaches the end.`
      : `We start with ${2 * n + 2} ropes, all at 0: one per row, one per column and one per diagonal. X pulls right, O pulls left.`,
    codeLine: codeLine(LINE.ropes),
    state: snap(null, 0),
  });

  moves.forEach((move, i) => {
    const k = i + 1;
    const add = move.player === 1 ? 1 : -1;
    const player = mark(move.player);
    board[move.row][move.col] = move.player;
    const through = linesThrough(n, move.row, move.col);
    const willWin = through.filter((line) => Math.abs(ropeValue(ropes, line) + add) === n);

    const placed: Frame = {
      scene,
      caption: `Move ${k}: ${player} marks row ${move.row}, column ${move.col}. Each rope through this cell gets ${fmtRope(add)}: a pull ${add > 0 ? "right" : "left"}.`,
      codeLine: codeLine(LINE.add),
      state: snap(move, k),
    };
    if (practice) placed.quiz = diagQuiz(n, move);
    else if (!askedDiag) {
      askedDiag = true;
      placed.quiz = diagQuiz(n, move);
    } else if (move.player === 2 && !askedDirection) {
      askedDirection = true;
      placed.quiz = directionQuiz;
    } else if (willWin.length === 1 && !askedEnd) {
      askedEnd = true;
      placed.quiz = endQuiz(n, move, ropes, willWin[0]);
    }
    frames.push(placed);

    const onDiag = move.row === move.col;
    const onAnti = move.row + move.col === n - 1;
    if (!practice) {
      ropes.rows[move.row] += add;
      ropes.cols[move.col] += add;
      frames.push({
        scene,
        caption: `Pull row ${move.row} and column ${move.col} one step: row ${move.row} reads ${fmtRope(ropes.rows[move.row])}, column ${move.col} reads ${fmtRope(ropes.cols[move.col])}.`,
        codeLine: LINE.row,
        state: snap(move, k, { lines: lit(through.slice(0, 2), "window") }),
      });
      if (onDiag) {
        ropes.diag += add;
        frames.push({
          scene,
          caption: `Row ${move.row} equals column ${move.col}, so this cell is on the ↘ diagonal. Pull that rope too: it reads ${fmtRope(ropes.diag)}.`,
          codeLine: LINE.diag,
          state: snap(move, k, { lines: lit([{ kind: "diag", index: 0 }], "window") }),
        });
      }
      if (onAnti) {
        ropes.anti += add;
        frames.push({
          scene,
          caption: `Row ${move.row} plus column ${move.col} is ${n - 1}, so this cell is on the ↗ diagonal. Pull that rope too: it reads ${fmtRope(ropes.anti)}.`,
          codeLine: LINE.anti,
          state: snap(move, k, { lines: lit([{ kind: "anti", index: 0 }], "window") }),
        });
      }
    } else {
      pull(ropes, n, move);
    }
    pulls += through.length;

    const wins = through.filter((line) => Math.abs(ropeValue(ropes, line)) === n);
    const full = through.find((line) => mixedFull(board, n, line)) ?? null;
    const answer = wins.length > 0 ? move.player : 0;

    if (practice) {
      const names = through.map(lineName);
      const listed = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
      frames.push({
        scene,
        caption: `${player} pulled ${through.length} ropes: ${listed}. Read them in the picture.${full && wins.length === 0 ? ` ${cap(lineName(full))} now holds ${n} marks.` : ""}`,
        state: snap(move, k, { lines: lit(through, "window") }),
        quiz: winQuiz(n, wins, ropes, move.player, full),
      });
    }

    results.push(answer);
    if (wins.length > 0) {
      frames.push({
        scene,
        caption: `${cap(lineName(wins[0]))} reaches ${fmtRope(ropeValue(ropes, wins[0]))}: ${n} steps, the whole rope. ${player} wins, so this move answers ${move.player}.`,
        codeLine: codeLine(LINE.win),
        state: snap(move, k, { lines: [...lit(through, "window"), ...lit(wins, "done")] }),
      });
      return;
    }
    const askTrap = full !== null && (practice || !shownTrap);
    if (full && !practice && !shownTrap) {
      shownTrap = true;
      results.pop();
      frames.push({
        scene,
        caption: `${cap(lineName(full))} now holds ${n} marks: one in every cell.`,
        codeLine: LINE.check,
        state: snap(move, k, { lines: lit([full], "window") }),
        quiz: winQuiz(n, wins, ropes, move.player, full),
      });
      results.push(answer);
    }
    frames.push({
      scene,
      caption: full
        ? askTrap
          ? `Counting both players together is the trap: ${n} marks, but from both players. The rope reads ${fmtRope(ropeValue(ropes, full))}, not ${n}. This move answers 0.`
          : `${cap(lineName(full))} is full but mixed, so it reads ${fmtRope(ropeValue(ropes, full))}. No rope is at the end, so this move answers 0.`
        : `No rope is at the end (${n} or −${n}), so this move answers 0.`,
      codeLine: codeLine(LINE.none),
      state: snap(move, k, { lines: full ? lit([full], "miss") : lit(through, "window"), plainCount: full ? { line: full, count: n } : null }),
    });
  });

  if (practice) {
    frames.push({
      scene,
      caption: `Done. The answers were ${show(results)}. You pulled the ropes yourself every move, and only a rope at the end counted as a win.`,
      state: snap(null, 0),
    });
    return frames;
  }
  frames.push({
    scene,
    caption: `All ${total} moves are done. The answer is ${show(results)}: one number per move.`,
    codeLine: LINE.win,
    state: snap(null, 0),
  });
  frames.push({
    scene,
    caption: `Time: O(1) per move. Each move pulls at most 4 ropes and checks only those, whatever the size of the board. Here: ${pulls} pulls in all, against ${slowReads} cells read the slow way.`,
    codeLine: LINE.check,
    state: snap(null, 0, { counter: { label: "ropes pulled in all", value: pulls } }),
  });
  frames.push({
    scene,
    caption: `Space: O(n). The code keeps only the ropes: ${n} rows, ${n} columns and 2 diagonals, ${2 * n + 2} numbers. The board is drawn here for us; the code never stores it.`,
    codeLine: LINE.ropes,
    state: snap(null, 0, { boardFaded: true, ropeTone: "hit" }),
  });
  return frames;
}

export const ticTacToeStory: ProblemStory<TicTacToeState> = {
  slugs: ["lc-348"],
  pattern: "Design: line counters",
  trigger: "an n × n game where each move must report whether a row, column or diagonal is now full of one player",
  insight: "A move can only complete its own row, its own column and the diagonals through it. Keep one rope per line: X pulls +1, O pulls −1, and a rope at n or −n is a win.",
  metaphor: {
    name: "The tug-of-war ropes",
    legend: "row rope = rows[r] · column rope = cols[c] · ↘ rope = diagonal · ↗ rope = antiDiagonal · pull right = +1 (player 1) · pull left = −1 (player 2) · rope at the end = ±n",
    terms: ["rope", "pull", "pulls", "pulled"],
  },
  traps: [
    {
      name: "Counting both players together",
      rule: "Pull one way for player 1 (+1) and the other way for player 2 (−1). A rope with both players' marks never reaches n or −n, so a plain count of marks is wrong.",
    },
  ],
  template: [
    "rows[n], cols[n], diag, anti: all 0      // one rope per line",
    "move(r, c, player):",
    "    add = (player == 1) ? +1 : -1        // each player pulls its own way",
    "    rows[r] += add;  cols[c] += add;",
    "    if (r == c) diag += add;   if (r + c == n - 1) anti += add;",
    "    return any touched rope at ±n ? player : 0;",
  ],
  complexity: {
    slow: "O(n) per move",
    time: "O(1) per move",
    timeWhy: "each move pulls and checks at most 4 ropes: its row, its column and up to two diagonals",
    space: "O(n)",
    spaceWhy: "n row ropes, n column ropes and 2 diagonal ropes; no board is stored",
  },
  code: CODE,
  examples: [
    {
      label: "3 × 3: X wins the bottom row",
      input: '["TicTacToe","move","move","move","move","move","move","move"]\n[[3],[0,0,1],[0,2,2],[2,2,1],[1,1,2],[2,0,1],[1,0,2],[2,1,1]]',
      expected: "[0,0,0,0,0,0,1]",
    },
    {
      label: "2 × 2: a mixed diagonal, then X wins the top row",
      input: '["TicTacToe","move","move","move"]\n[[2],[0,0,1],[1,1,2],[0,1,1]]',
      expected: "[0,0,1]",
      note: "Tricky: the diagonal fills up with one X and one O",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-36", title: "Valid Sudoku" },
    { slug: "lc-51", title: "N-Queens" },
    { slug: "lc-289", title: "Game of Life" },
  ],
  answer: (raw) => show(simulate(parseInput(raw)).results),
  frames: (raw) => {
    const input = parseInput(raw);
    const { results, reads } = simulate(input);
    const board = emptyBoard(input.n);
    const ropes = emptyRopes(input.n);
    for (const move of input.moves) {
      board[move.row][move.col] = move.player;
      pull(ropes, input.n, move);
    }
    const last = input.moves.at(-1);
    const wins = last ? fullLinesThrough(board, input.n, last.row, last.col) : [];
    return [
      ...pictureFrames(input, results),
      ...slowFrames(input),
      ...insightFrames(input),
      ...solutionFrames(input, "solution", false, reads),
      ...solutionFrames(parseInput(PRACTICE), "card", true, 0),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(input.n), board, ropes, lines: wins.map((line) => ({ line, tone: "done" as CellTone })), answers: [...results] },
      },
    ];
  },
  View: TicTacToeView,
};
