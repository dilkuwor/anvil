import type { CellTone } from "@/components/learn/viz/primitives";

import { CarryRowsView, type BitRow, type CarryRowsState } from "../rec08-carry-rows-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<CarryRowsState>;

/** Fresh pair for the "your turn" run. The carry ripples up for four rounds. */
const PRACTICE = "a = 7, b = 1";

const CODE = [
  "public int getSum(int a, int b) {",
  "    while (b != 0) {",
  "        int carry = (a & b) << 1;",
  "        a = a ^ b;",
  "        b = carry;",
  "    }",
  "    return a;",
  "}",
];

function parse(raw: string): { a: number; b: number } {
  const [a = 0, b = 0] = (raw.match(/-?\d+/g) ?? []).map((token) => Number.parseInt(token, 10));
  return { a, b };
}

/** How many columns the pictures need: enough for every value the run produces. */
function columnsFor(a: number, b: number): number {
  if (a < 0 || b < 0) return 32;
  let top = Math.max(a, b, a + b);
  let x = a;
  let y = b;
  while (y !== 0) {
    const carry = (x & y) << 1;
    x ^= y;
    y = carry;
    top = Math.max(top, carry, x);
  }
  return Math.max(4, top.toString(2).length);
}

const bitsOf = (value: number, width: number) => Array.from({ length: width }, (_, k) => String((value >>> (width - 1 - k)) & 1));
const binary = (value: number, width: number) => bitsOf(value, width).join("");

function row(label: string, value: number, width: number, paint: (index: number, bit: string) => CellTone | null = () => null, wrong = false): BitRow {
  const bits = bitsOf(value, width);
  return { label, value: String(value), bits, tones: bits.map((bit, index) => paint(index, bit) ?? "idle"), wrong };
}

function emptyRow(label: string, width: number): BitRow {
  return { label, value: "?", bits: Array.from({ length: width }, () => " "), tones: Array.from({ length: width }, () => "faded") };
}

function blank(rows: BitRow[]): CarryRowsState {
  return { rows, column: null, round: null, counter: null, note: null };
}

/** Columns where both numbers hold a 1: exactly the ones that make a carry. */
const shared = (a: number, b: number, width: number) => (index: number) => ((a & b) >>> (width - 1 - index)) & 1;

function pictureFrames(a: number, b: number, width: number): Frame[] {
  const sum = (a + b) | 0;
  return [
    {
      scene: "picture",
      caption: `We want ${a} plus ${b}. Each number is written in bits: a row of 1s and 0s, one column for each power of two.`,
      state: blank([row("a", a, width), row("b", b, width)]),
    },
    {
      scene: "picture",
      caption: "Allowed: bit tools. AND, OR and XOR compare two rows column by column, and a shift moves a row one column left.",
      state: blank([row("a", a, width), row("b", b, width)]),
    },
    {
      scene: "picture",
      caption: "Not allowed: the plus sign or the minus sign. The adding has to be done with bits alone.",
      state: blank([row("a", a, width, () => "miss"), row("b", b, width, () => "miss")]),
    },
    {
      scene: "picture",
      caption: `The goal: build the sum, ${sum}, written as ${binary(sum, width)}, out of bit moves.`,
      state: blank([row("a", a, width), row("b", b, width), row("sum", sum, width, () => "done")]),
    },
  ];
}

function slowFrames(a: number, b: number, width: number): Frame[] {
  const frames: Frame[] = [];
  let carry = 0;
  let result = 0;
  let columns = 0;
  for (let i = 0; i < 32; i++) {
    const x = (a >>> i) & 1;
    const y = (b >>> i) & 1;
    const bit = x ^ y ^ carry;
    const carryIn = carry;
    carry = (x & y) | (carry & (x ^ y));
    result |= bit << i;
    columns++;
    if (i < width && i < 4) {
      const column = width - 1 - i;
      const built = (result & ((1 << (i + 1)) - 1)) >>> 0;
      frames.push({
        scene: "slow",
        caption:
          i === 0
            ? `The slow way adds like on paper: one column at a time, from the right, with a carry. Column 1 gives ${bit}${carry ? " and a carry" : ""}.`
            : `Column ${i + 1}: ${carryIn ? `${x}, ${y} and the carry` : `${x} and ${y}`} give ${bit}${carry ? ", with a carry to the next column" : ""}.`,
        state: {
          ...blank([row("a", a, width), row("b", b, width), { ...row("sum so far", built, width, (index) => (index >= column ? "hit" : "faded")), value: "…" }]),
          column,
          counter: { label: "columns added", value: columns },
        },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `A Java int has 32 columns, and the paper way walks all ${columns} of them every time, one by one: O(w) steps, where w = 32.`,
    state: { ...blank([row("a", a, width), row("b", b, width), row("sum", result | 0, width, () => "done")]), counter: { label: "columns added", value: columns } },
  });
  return frames;
}

function insightFrames(a: number, b: number, width: number): Frame[] {
  const carry = (a & b) << 1;
  const written = a ^ b;
  const both = shared(a, b, width);
  return [
    {
      scene: "insight",
      caption: "Picture two helpers. The writer does XOR: in each column it writes 1 when exactly one of a and b has a 1. It ignores every carry.",
      state: blank([row("a", a, width), row("b", b, width), row("writer: XOR", written, width, (_, bit) => (bit === "1" ? "edge" : null))]),
    },
    {
      scene: "insight",
      caption: `The carrier does AND: it finds the columns where both have a 1. Each makes a carry, so it moves them one column left: ${binary(carry, width)}.`,
      state: blank([
        row("a", a, width, (index) => (both(index) ? "hit" : null)),
        row("b", b, width, (index) => (both(index) ? "hit" : null)),
        row("carrier: AND, left", carry, width, (_, bit) => (bit === "1" ? "hit" : null)),
      ]),
    },
    {
      scene: "insight",
      caption: "The writer's row plus the carrier's row is still the same sum. So add those two the same way, again and again, until the carrier brings nothing.",
      state: blank([row("writer: XOR", written, width, () => "window"), row("carrier: AND, left", carry, width, () => "hit")]),
    },
  ];
}

const orderQuiz: StoryQuiz = {
  kind: "choice",
  question: "A new round starts. Which job must happen first?",
  options: ["The carrier works out the carry from a and b", "The writer changes a to a XOR b"],
  answer: 0,
  why: "The carrier needs the old a. Once the writer changes a, the columns that carry are lost.",
};

function stopQuiz(carry: number): StoryQuiz {
  return {
    kind: "choice",
    question: "b now holds what the carrier brought. Is the adding finished?",
    options: ["Yes: stop and return a", "No: run another round"],
    answer: carry === 0 ? 0 : 1,
    why: carry === 0 ? "The carrier brought nothing, so there is nothing left to add." : "The carrier brought some 1s, and they still have to be added in.",
  };
}

/** The real loop, one frame per change. `practice` asks at every decision. */
function solutionFrames(a0: number, b0: number, width: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  let a = a0;
  let b = b0;
  let round = 0;
  let askedOrder = false;
  let askedGo = false;
  let askedStop = false;
  let showedTrap = false;
  const line = (index: number) => (practice ? undefined : index);
  const at = (rows: BitRow[], extra: Partial<CarryRowsState> = {}): CarryRowsState => ({ ...blank(rows), round: round || null, ...extra });

  frames.push({
    scene,
    caption: practice ? `Your turn: ${a0} plus ${b0}. You choose which helper goes first, and when to stop.` : `a is ${a}, and b is ${b}. While b still holds any 1s, the helpers keep working.`,
    codeLine: line(1),
    state: at([row("a", a, width), row("b", b, width), emptyRow("carry", width)]),
  });

  while (b !== 0) {
    round++;
    const both = shared(a, b, width);
    const carry = (a & b) << 1;
    const start: Frame = {
      scene,
      caption: `Round ${round}: the writer and the carrier look at a and b.`,
      codeLine: line(1),
      state: at([row("a", a, width), row("b", b, width), emptyRow("carry", width)]),
    };
    if (practice || !askedOrder) {
      askedOrder = true;
      start.quiz = orderQuiz;
    }
    frames.push(start);
    frames.push({
      scene,
      caption:
        carry === 0
          ? "The carrier goes first. No column has two 1s, so there is no carry this time."
          : `The carrier goes first. The columns with two 1s move one step left: the carry is ${binary(carry, width)}, which is ${carry}.`,
      codeLine: line(2),
      state: at([row("a", a, width, (index) => (both(index) ? "hit" : null)), row("b", b, width, (index) => (both(index) ? "hit" : null)), row("carry", carry, width, (_, bit) => (bit === "1" ? "hit" : null))]),
    });
    const oldA = a;
    a = a ^ b;
    frames.push({
      scene,
      caption: `Now the writer writes a XOR b into a: a 1 wherever exactly one of them had a 1. a becomes ${binary(a, width)}, which is ${a}.`,
      codeLine: line(3),
      state: at([row("a", a, width, () => "edge"), row("b", b, width), row("carry", carry, width, () => "hit")]),
    });
    if (!showedTrap && carry !== 0) {
      showedTrap = true;
      const wrong = (a & b) << 1;
      frames.push({
        scene,
        caption: `The Order Trap: had the writer gone first, the carrier would read this new a and get ${wrong} instead of ${carry}. The old a (${oldA}) was needed.`,
        codeLine: line(2),
        state: at([row("a", a, width, () => "edge"), row("b", b, width), row("carry", carry, width, () => "done"), row("✕ carry from new a", wrong, width, () => "miss", true)]),
      });
    }
    b = carry;
    const handover: Frame = {
      scene,
      caption: carry === 0 ? "b takes the carrier's row, which is empty: b is 0." : `b takes the carrier's row: b is now ${b}. Those carries still need adding.`,
      codeLine: line(4),
      state: at([row("a", a, width), row("b", b, width, () => "edge"), emptyRow("carry", width)]),
    };
    const ask = practice || (carry === 0 ? !askedStop : !askedGo);
    if (ask) {
      if (carry === 0) askedStop = true;
      else askedGo = true;
      handover.quiz = stopQuiz(carry);
    }
    frames.push(handover);
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${a}. The carrier went first every round.` : `The carrier brought nothing, so the helpers stop. a is ${binary(a, width)}. The answer is ${a}.`,
    codeLine: line(6),
    state: at([row("a", a, width, () => "done"), row("b", b, width, () => "faded")], { note: `${a0} + ${b0} = ${a} with no plus sign` }),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(w), where w = 32 bits. This took ${round} ${round === 1 ? "round" : "rounds"}. Each round moves the carry at least one column left, so 32 is the most.`,
      codeLine: 1,
      state: at([row("a", a, width, () => "done")], { counter: { label: "rounds", value: round } }),
    });
    frames.push({
      scene,
      caption: "Space: O(1). The helpers only ever hold a, b and one carry, however large the numbers are.",
      codeLine: 2,
      state: at([row("a", a, width, () => "done"), row("b", b, width), row("carry", 0, width)]),
    });
  }
  return frames;
}

export const sumOfTwoIntegersStory: ProblemStory<CarryRowsState> = {
  slugs: ["lc-371"],
  pattern: "Bits: XOR plus carry",
  trigger: "add or combine two numbers when plus and minus are not allowed",
  insight: "A writer and a carrier. The writer (XOR) writes every column's digit at once but forgets carries. The carrier (AND, one step left) brings them back for the next round.",
  metaphor: { name: "The writer and the carrier", legend: "writer = a ^ b · carrier = (a & b) << 1 · a round = one pass of the loop", terms: ["writer", "carrier", "carry", "round"] },
  traps: [{ name: "The Order Trap", rule: "Work out the carry from the old a before a changes. Compute (a & b) << 1 first, then a = a ^ b." }],
  template: [
    "while (there is still something to add) {",
    "    carries = the columns where both have a 1, moved one left",
    "    digits  = a XOR b",
    "    a = digits; b = carries",
    "}",
  ],
  complexity: {
    slow: "O(w)",
    time: "O(w)",
    timeWhy: "each round moves the carry at least one column left, so at most w = 32 rounds, and often only one or two",
    space: "O(1)",
    spaceWhy: "only a, b and the carry",
  },
  code: CODE,
  examples: [
    { label: "9 + 11", input: "a = 9, b = 11", expected: "20" },
    { label: "2 + 3", input: "a = 2, b = 3", expected: "5" },
    { label: "1 + 2", input: "a = 1, b = 2", expected: "3", note: "No column has two 1s, so one round is enough" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-136", title: "Single Number" },
    { slug: "lc-338", title: "Counting Bits" },
    { slug: "lc-191", title: "Number of 1 Bits" },
  ],
  answer: (input) => {
    const { a, b } = parse(input);
    return String((a + b) | 0);
  },
  frames: (input) => {
    const { a, b } = parse(input);
    const width = columnsFor(a, b);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(a, b, width),
      ...slowFrames(a, b, width),
      ...insightFrames(a, b, width),
      ...solutionFrames(a, b, width),
      ...solutionFrames(practice.a, practice.b, columnsFor(practice.a, practice.b), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: insightFrames(a, b, width)[2].state,
      },
    ];
  },
  View: CarryRowsView,
};
