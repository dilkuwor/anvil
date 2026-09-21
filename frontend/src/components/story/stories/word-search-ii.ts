import {
  AgyGridsFieldView,
  type FieldCell,
  type FieldLegendItem,
  type FieldPos,
  type FieldState,
  type FieldTone,
} from "../agy-grids-field-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<FieldState>;

const PRACTICE = '["ab","cd"]  ["ab","ac"]';
const TRAP = "The Duplicate Harvest Trap";

const CODE = [
  "List<String> findWords(char[][] board, String[] words) {",
  "    TrieNode root = buildTrie(words);",
  "    List<String> out = new ArrayList<>();",
  "    for (int r = 0; r < board.length; r++) {",
  "        for (int c = 0; c < board[0].length; c++) {",
  "            walk(board, r, c, root, out);",
  "        }",
  "    }",
  "    return out;",
  "}",
  "",
  "void walk(char[][] board, int r, int c, TrieNode node, List<String> out) {",
  "    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) return;",
  "    char letter = board[r][c];",
  "    if (letter == '#') return;",
  "    TrieNode next = node.children[letter - 'a'];",
  "    if (next == null) return;",
  "    if (next.word != null) {",
  "        out.add(next.word);",
  "        next.word = null;",
  "    }",
  "    board[r][c] = '#';",
  "    walk(board, r + 1, c, next, out);",
  "    walk(board, r - 1, c, next, out);",
  "    walk(board, r, c + 1, next, out);",
  "    walk(board, r, c - 1, next, out);",
  "    board[r][c] = letter;",
  "}",
];

const LEGEND: FieldLegendItem[] = [
  { mark: "open", label: "letter stone" },
  { mark: "front", label: "current stone" },
  { mark: "taken", label: "harvested word" },
  { mark: "block", label: "pebble mark (#)" },
  { mark: "bad", label: "duplicate trap" },
];

function parseInput(input: string): { grid: string[][]; words: string[] } {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const parsedGrid = JSON.parse(parts[0]) as string[];
      const words = JSON.parse(parts[1]) as string[];
      const grid = parsedGrid.map((row) => row.split(""));
      return { grid, words };
    }
  } catch {
    // fallback
  }
  return {
    grid: [
      ["o", "a", "a", "n"],
      ["e", "t", "a", "e"],
      ["i", "h", "k", "r"],
      ["i", "f", "l", "v"],
    ],
    words: ["oath", "pea", "eat", "rain"],
  };
}

class TrieNode {
  children = new Map<string, TrieNode>();
  word: string | null = null;
}

function buildTrie(words: string[]): TrieNode {
  const root = new TrieNode();
  for (const w of words) {
    let node = root;
    for (const ch of w) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new TrieNode());
      }
      node = node.children.get(ch)!;
    }
    node.word = w;
  }
  return root;
}

function solve(grid: string[][], words: string[]): string[] {
  const root = buildTrie(words);
  const rows = grid.length;
  const cols = grid[0].length;
  const board = grid.map((r) => [...r]);
  const out: string[] = [];

  const walk = (r: number, c: number, node: TrieNode) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const letter = board[r][c];
    if (letter === "#") return;
    const next = node.children.get(letter);
    if (!next) return;
    if (next.word !== null) {
      out.push(next.word);
      next.word = null;
    }
    board[r][c] = "#";
    walk(r + 1, c, next);
    walk(r - 1, c, next);
    walk(r, c + 1, next);
    walk(r, c - 1, next);
    board[r][c] = letter;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walk(r, c, root);
    }
  }
  return out.sort();
}

function answerText(input: string): string {
  const { grid, words } = parseInput(input);
  return JSON.stringify(solve(grid, words));
}

function makeCells(
  grid: string[][],
  cursor?: FieldPos,
  path: FieldPos[] = [],
  harvested: FieldPos[] = [],
  trapPos?: FieldPos,
): FieldCell[][] {
  const pathSet = new Set(path.map(([r, c]) => `${r},${c}`));
  const harvestSet = new Set(harvested.map(([r, c]) => `${r},${c}`));

  return grid.map((row, r) =>
    row.map((val, c) => {
      let tone: FieldTone = "open";
      if (trapPos && trapPos[0] === r && trapPos[1] === c) {
        tone = "bad";
      } else if (cursor && cursor[0] === r && cursor[1] === c) {
        tone = "front";
      } else if (harvestSet.has(`${r},${c}`)) {
        tone = "taken";
      } else if (pathSet.has(`${r},${c}`)) {
        tone = "block";
      }
      return { text: val, tone };
    }),
  );
}

function pictureFrames(grid: string[][]): Frame[] {
  return [
    {
      scene: "picture",
      caption: "A grid of letter stones hides words waiting to be found along adjacent paths.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        note: "grid of letter stones",
      },
    },
    {
      scene: "picture",
      caption: "We can step up, down, left, or right, placing a pebble on each stone to avoid stepping on it twice.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        note: "four compass directions",
      },
    },
    {
      scene: "picture",
      caption: "The goal is to find all dictionary words formed by continuous stone paths.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        note: "find all valid words",
      },
    },
  ];
}

function slowFrames(grid: string[][]): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way launches a fresh grid search for every single word in the dictionary.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        counter: { label: "words to scan", value: 4 },
        note: "search word by word",
      },
    },
    {
      scene: "slow",
      caption: "Scanning thousands of words one by one wastes time repeating identical prefix paths.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        counter: { label: "repeated steps", value: 16 },
        note: "redundant path steps",
      },
    },
    {
      scene: "slow",
      caption: "A prefix tree lets us search for all words simultaneously along a single trail.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        note: "guide search with tree",
      },
    },
  ];
}

function insightFrames(grid: string[][]): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Store all dictionary words in a prefix tree. As we step on stones, follow the matching branch.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        note: "shared prefix tree",
      },
    },
    {
      scene: "insight",
      caption: "If a stone letter has no branch in the tree, stop exploring that trail immediately.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        note: "prune missing branches",
      },
    },
  ];
}

function solutionFrames(grid: string[][], words: string[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const root = buildTrie(words);
  const rows = grid.length;
  const cols = grid[0].length;
  const board = grid.map((r) => [...r]);
  const found: string[] = [];
  const harvestedCells: FieldPos[] = [];
  let askedTrap = false;

    frames.push({
      scene,
      codeLine: 1,
      caption: "Build the prefix tree from all dictionary words so common prefixes share root branches.",
      state: {
        cells: makeCells(grid),
        legend: LEGEND,
        counter: { label: "words to find", value: words.length },
        note: "tree ready at root",
      },
    });

  const stepList: { r: number; c: number }[] = [];

  const walk = (r: number, c: number, node: TrieNode) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const letter = board[r][c];
    if (letter === "#") return;
    const next = node.children.get(letter);
    if (!next) return;

    stepList.push({ r, c });
    const currPath: FieldPos[] = stepList.map((p) => [p.r, p.c]);

    frames.push({
      scene,
      codeLine: 15,
      caption: `Step on stone "${letter}" at (${r}, ${c}). The letter branch matches in the tree.`,
      state: {
        cells: makeCells(grid, [r, c], currPath, harvestedCells),
        legend: LEGEND,
        note: `matched letter "${letter}"`,
      },
    });

    if (next.word !== null) {
      const word = next.word;
      found.push(word);
      harvestedCells.push([r, c]);

      if (!askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `We harvested word "${word}". Why do we set next.word = null immediately?`,
          options: [
            "to prevent adding duplicate copies if another trail spells the same word",
            "to remove the letters from the stones permanently",
          ],
          answer: 0,
          why: "Multiple paths can spell the same dictionary word. Clearing next.word avoids duplicates.",
        };

        frames.push({
          scene,
          codeLine: 19,
          caption: `${TRAP}: grid trails can spell the same word from multiple stone paths.`,
          state: {
            cells: makeCells(grid, [r, c], currPath, harvestedCells, [r, c]),
            legend: LEGEND,
            note: "clear next.word to avoid duplicates",
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 19,
          caption: `Set next.word = null. Word "${word}" is harvested safely without duplicates.`,
          state: {
            cells: makeCells(grid, [r, c], currPath, harvestedCells),
            legend: LEGEND,
            note: `harvested "${word}"`,
          },
        });
      } else {
        frames.push({
          scene,
          codeLine: 18,
          caption: `Harvested word "${word}". Stone trail completed successfully.`,
          state: {
            cells: makeCells(grid, [r, c], currPath, harvestedCells),
            legend: LEGEND,
            note: `harvested "${word}"`,
          },
        });
      }
      next.word = null;
    }

    board[r][c] = "#";
    const dirs: FieldPos[] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dr, dc] of dirs) {
      walk(r + dr, c + dc, next);
    }
    board[r][c] = letter;
    stepList.pop();
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walk(r, c, root);
    }
  }

  const sortedFound = [...found].sort();

  frames.push({
    scene,
    codeLine: 8,
    caption: `All words gathered from the stones. The answer is ${JSON.stringify(sortedFound)}.`,
    state: {
      cells: makeCells(grid, undefined, [], harvestedCells),
      legend: LEGEND,
      counter: { label: "found words", value: sortedFound.length },
      note: "exploration complete",
    },
  });

  frames.push({
    scene,
    codeLine: 8,
    caption: "Time: O(m · n · 4^L). Tree branches prune impossible trails from each stone.",
    state: {
      cells: makeCells(grid, undefined, [], harvestedCells),
      legend: LEGEND,
      note: "time complexity",
    },
  });

  frames.push({
    scene,
    codeLine: 8,
    caption: "Space: O(N · L). The tree stores common prefix letters across all dictionary words.",
    state: {
      cells: makeCells(grid, undefined, [], harvestedCells),
      legend: LEGEND,
      note: "space complexity",
    },
  });

  return frames;
}

function cardFrames(grid: string[][]): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why is searching with a Trie faster than searching each word separately on the grid?",
    options: [
      "it searches for all words together, pruning branches as soon as a prefix is missing",
      "it turns the 2D grid into a 1D line of characters",
    ],
    answer: 0,
    why: "Shared prefixes are checked once for all words simultaneously instead of restarting search W times.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What must we do after exploring all four neighbor steps from a grid cell?",
    options: [
      "restore the original letter on the stone so other paths can visit it",
      "leave the stone marked with '#' permanently",
    ],
    answer: 0,
    why: "Restoring the original character unmasks the cell for subsequent recursive paths.",
  };

  frames.push({
    scene,
    caption: "When searching for multiple words on a grid, guide stone exploration with a shared prefix tree.",
    state: {
      cells: makeCells(grid),
      legend: LEGEND,
      note: "trie guided search",
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Clear next.word immediately when harvesting to prevent duplicate entries from other trails.",
    state: {
      cells: makeCells(grid),
      legend: LEGEND,
      note: "avoid duplicate harvest",
    },
  });

  frames.push({
    scene,
    caption: "Always restore the stone character after visiting all neighbor branches.",
    state: {
      cells: makeCells(grid),
      legend: LEGEND,
      note: "unmask stone pebble",
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the alphabet trail on stones: step down shared prefixes, mark visited cells, and harvest each word once.",
    state: {
      cells: makeCells(grid),
      legend: LEGEND,
      note: "all words discovered",
    },
  });

  return frames;
}

export const wordSearchIIStory: ProblemStory<FieldState> = {
  slugs: ["lc-212"],
  pattern: "Trie",
  trigger: "find all words from a dictionary that can be formed by sequentially adjacent grid letters",
  insight: "Insert all dictionary words into a prefix tree. As we explore the grid in four directions, walk down matching branches, pruning as soon as a prefix is missing.",
  metaphor: {
    name: "The alphabet trail on stones",
    legend: "stone = grid letter · trail = step sequence · pebble = visited mark (#) · harvest = collecting word",
    terms: ["trail", "stone", "letter", "pebble", "grid", "harvest", "word", "step", "branch", "root"],
  },
  traps: [{ name: TRAP, rule: "Set next.word = null immediately after adding it to out to avoid duplicate entries." }],
  template: [
    "class Solution:",
    "    List<String> findWords(char[][] board, String[] words):",
    "        build Trie with words",
    "        explore 4 directions from each cell, matching Trie branches",
    "        clear next.word upon harvesting to avoid duplicate words",
  ],
  complexity: {
    slow: "O(W · m · n · 4^L)",
    time: "O(m · n · 4^L)",
    timeWhy: "we explore the grid once, pruning branches immediately whenever a prefix is absent from the Trie",
    space: "O(N · L)",
    spaceWhy: "the Trie stores all N words with up to L characters each, plus O(L) recursion depth",
  },
  code: CODE,
  examples: [
    {
      label: "oath eat",
      input: '["oaan","etae","ihkr","iflv"]  ["oath","pea","eat","rain"]',
      expected: '["eat","oath"]',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-208", title: "Implement Trie (Prefix Tree)" },
    { slug: "lc-211", title: "Design Add and Search Words Data Structure" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const { grid, words } = parseInput(input);
    return [
      ...pictureFrames(grid),
      ...slowFrames(grid),
      ...insightFrames(grid),
      ...solutionFrames(grid, words),
      ...cardFrames(grid),
    ];
  },
  View: AgyGridsFieldView,
};
