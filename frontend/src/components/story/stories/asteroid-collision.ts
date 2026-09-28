import type { CellTone } from "@/components/learn/viz/primitives";

import { StackLaneView, type StackLaneState } from "../rec02-stack-lane-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StackLaneState>;

/** Fresh lane for the "your turn" run. A left-mover sits on the pile when a right-mover arrives. */
const PRACTICE = "-3,4,-4,2,-1";
const FALLBACK = [5, 10, -5];

const CODE = [
  "Deque<Integer> pile = new ArrayDeque<>();",
  "for (int rock : asteroids) {",
  "    boolean alive = true;",
  "    while (alive && rock < 0 && !pile.isEmpty() && pile.peekLast() > 0) {",
  "        if (pile.peekLast() < -rock) pile.removeLast();",
  "        else {",
  "            if (pile.peekLast() == -rock) pile.removeLast();",
  "            alive = false;",
  "        }",
  "    }",
  "    if (alive) pile.addLast(rock);",
  "}",
  "int[] out = new int[pile.size()];",
  "for (int i = 0; i < out.length; i++) out[i] = pile.removeFirst();",
  "return out;",
];

function parseInput(raw: string): number[] {
  const rocks = (raw.match(/-?\d+/g) ?? []).map(Number).filter((value) => value !== 0);
  return rocks.length > 0 ? rocks : FALLBACK;
}

/** How an asteroid is drawn and named: the size, with an arrow for its direction. */
const show = (rock: number) => (rock > 0 ? `${rock}→` : `←${-rock}`);
const list = (rocks: number[]) => `[${rocks.join(",")}]`;

/** An independent check: resolve one crash at a time until none is left. */
function survivors(asteroids: number[]): number[] {
  const rocks = [...asteroids];
  for (;;) {
    const at = rocks.findIndex((rock, index) => index + 1 < rocks.length && rock > 0 && rocks[index + 1] < 0);
    if (at < 0) return rocks;
    const [a, b] = [rocks[at], -rocks[at + 1]];
    if (a > b) rocks.splice(at + 1, 1);
    else if (a < b) rocks.splice(at, 1);
    else rocks.splice(at, 2);
  }
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

type Pile = { rock: number; from: number }[];

function lane(rocks: number[], pile: Pile, opts: { pointer?: number | null; gone?: Set<number>; hot?: number[]; topTone?: CellTone | null; extra?: Partial<StackLaneState> } = {}): StackLaneState {
  const { pointer = null, gone = new Set<number>(), hot = [], topTone = null, extra = {} } = opts;
  return {
    rows: [
      {
        label: "lane",
        items: rocks.map(show),
        tones: tones(rocks.length, (index) => (hot.includes(index) ? "miss" : gone.has(index) ? "faded" : index === pointer ? "edge" : null)),
        pointer,
        pointerLabel: "incoming",
      },
    ],
    stack: pile.map((entry) => show(entry.rock)),
    stackTones: tones(pile.length, (index) => (index === pile.length - 1 && topTone ? topTone : null)),
    stackLabel: "survivors",
    ...extra,
  };
}

function pictureFrames(rocks: number[]): Frame[] {
  const crash = rocks.findIndex((rock, index) => index + 1 < rocks.length && rock > 0 && rocks[index + 1] < 0);
  const apart = rocks.findIndex((rock, index) => index + 1 < rocks.length && rock < 0 && rocks[index + 1] > 0);
  const answer = survivors(rocks);
  const frames: Frame[] = [
    { scene: "picture", caption: "Asteroids fly along a lane. The number is the size, and the arrow shows which way it flies.", state: lane(rocks, []) },
  ];
  frames.push({
    scene: "picture",
    caption:
      crash >= 0
        ? `${show(rocks[crash])} and ${show(rocks[crash + 1])} fly toward each other, so they crash. The smaller one explodes. Same size: both explode.`
        : "When a right-flier meets a left-flier, the smaller one explodes. Same size: both explode.",
    state: lane(rocks, [], { hot: crash >= 0 ? [crash, crash + 1] : [] }),
  });
  frames.push({
    scene: "picture",
    caption:
      apart >= 0
        ? `Not a crash: ${show(rocks[apart])} and ${show(rocks[apart + 1])} fly away from each other. They never meet.`
        : "Not a crash: two asteroids flying the same way, or away from each other, never meet.",
    state: lane(rocks, [], { extra: { note: apart >= 0 ? { text: `✕ ${show(rocks[apart])} and ${show(rocks[apart + 1])} never meet`, tone: "coral" } : null } }),
  });
  frames.push({
    scene: "picture",
    caption: "The goal: list the asteroids that are left when all crashes are over, in their order.",
    state: lane(rocks, [], { extra: { result: `answer: ${list(answer)}` } }),
  });
  return frames;
}

/** The slow way: scan for a crash, resolve it, and scan again from the start. */
function slowFrames(rocks: number[]): Frame[] {
  const frames: Frame[] = [];
  const alive = rocks.map((rock, from) => ({ rock, from }));
  const gone = new Set<number>();
  let looked = 0;
  let pass = 0;
  for (;;) {
    pass += 1;
    let at = -1;
    for (let index = 0; index + 1 < alive.length; index++) {
      looked += 1;
      if (alive[index].rock > 0 && alive[index + 1].rock < 0) {
        at = index;
        break;
      }
    }
    const opener = pass === 1 ? "The slow way: scan the lane for a right-flier just before a left-flier. " : "Scan again from the start. ";
    if (at < 0) {
      frames.push({
        scene: "slow",
        caption: `${opener}No crash is left.`,
        state: lane(rocks, [], { gone, extra: { counter: { label: "pairs looked at", value: looked } } }),
      });
      break;
    }
    const [a, b] = [alive[at], alive[at + 1]];
    const hot = [a.from, b.from];
    let result: string;
    if (a.rock > -b.rock) {
      alive.splice(at + 1, 1);
      gone.add(b.from);
      result = `${show(b.rock)} explodes.`;
    } else if (a.rock < -b.rock) {
      alive.splice(at, 1);
      gone.add(a.from);
      result = `${show(a.rock)} explodes.`;
    } else {
      alive.splice(at, 2);
      gone.add(a.from);
      gone.add(b.from);
      result = "Both explode.";
    }
    if (pass <= 3) {
      frames.push({
        scene: "slow",
        caption: `${opener}Found ${show(a.rock)} and ${show(b.rock)}. ${result}`,
        state: lane(rocks, [], { gone: new Set([...gone].filter((index) => !hot.includes(index))), hot, extra: { counter: { label: "pairs looked at", value: looked } } }),
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `That was ${pass} scan${pass === 1 ? "" : "s"} and ${looked} pair${looked === 1 ? "" : "s"} looked at. Each crash starts a new scan of the lane: O(n²) time.`,
    state: lane(rocks, [], { gone, extra: { counter: { label: "pairs looked at", value: looked } } }),
  });
  return frames;
}

type Outcome = "apart" | "top" | "incoming" | "both";

function outcome(top: number | null, rock: number): Outcome {
  if (top === null || !(top > 0 && rock < 0)) return "apart";
  if (top < -rock) return "top";
  if (top > -rock) return "incoming";
  return "both";
}

function insightFrames(rocks: number[]): Frame[] {
  // Run the real loop to the first crash, so the picture is this lane's own moment.
  const pile: Pile = [];
  for (let index = 0; index < rocks.length; index++) {
    const rock = rocks[index];
    const top = pile.length ? pile[pile.length - 1].rock : null;
    if (outcome(top, rock) !== "apart") {
      return [
        {
          scene: "insight",
          caption: "Keep the survivors on a pile, in lane order. Only the newest survivor, on top, is close enough to meet the next asteroid.",
          state: lane(rocks, pile, { pointer: index }),
        },
        {
          scene: "insight",
          caption: `A crash needs the top to fly right and the incoming one to fly left, like ${show(top as number)} and ${show(rock)}.`,
          state: lane(rocks, pile, { pointer: index, hot: [index], topTone: "miss" }),
        },
        {
          scene: "insight",
          caption: "The incoming asteroid keeps crashing into each new top until it explodes, or nothing in front of it flies right.",
          state: lane(rocks, pile, { pointer: index, topTone: "miss", extra: { note: { text: "crash, then check the new top", tone: "teal" } } }),
        },
      ];
    }
    pile.push({ rock, from: index });
  }
  return [];
}

function crashQuiz(top: number, rock: number, result: Outcome): StoryQuiz {
  return {
    kind: "choice",
    question: `The top survivor is ${show(top)}. The incoming asteroid is ${show(rock)}. What happens?`,
    options: ["No crash: the incoming one joins the survivors", "Crash: the top survivor explodes", "Crash: the incoming one explodes", "Crash: both explode"],
    answer: result === "apart" ? 0 : result === "top" ? 1 : result === "incoming" ? 2 : 3,
    why:
      result === "apart"
        ? top < 0 && rock > 0
          ? "They have opposite arrows, but they fly away from each other. They never meet."
          : "They fly the same way, so they never meet."
        : result === "top"
          ? `${show(top)} is smaller, so it explodes and the incoming one flies on.`
          : result === "incoming"
            ? `${show(rock)} is smaller, so it explodes.`
            : "They are the same size, so both explode.",
  };
}

function solutionFrames(rocks: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = new Set<string>();
  const pile: Pile = [];
  const gone = new Set<number>();
  let moves = 0;
  let shownTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new lane: ${rocks.map(show).join(" ")}. You call each meeting.` : "The survivor pile starts empty. Asteroids come in from the left, one at a time.",
    codeLine: line(0),
    state: lane(rocks, pile),
  });

  for (let index = 0; index < rocks.length; index++) {
    const rock = rocks[index];
    let alive = true;
    let first = true;
    for (;;) {
      const top = pile.length ? pile[pile.length - 1] : null;
      const result = outcome(top ? top.rock : null, rock);
      if (!top) {
        frames.push({
          scene,
          caption: `${show(rock)} comes in. The survivor pile is empty, so nothing is in front of it. It joins the survivors.`,
          codeLine: line(10),
          state: lane(rocks, [...pile, { rock, from: index }], { pointer: index, gone }),
        });
        break;
      }
      const meet: Frame = {
        scene,
        caption: first ? `${show(rock)} comes in. The top survivor is ${show(top.rock)}.` : `Now the top survivor is ${show(top.rock)}, and ${show(rock)} is still flying.`,
        codeLine: line(first ? 1 : 3),
        state: lane(rocks, pile, { pointer: index, gone }),
      };
      // Flying apart with opposite arrows is the trap, so it is its own kind of decision.
      const kind = result === "apart" && top.rock < 0 && rock > 0 ? "passing" : result;
      if (practice || !asked.has(kind)) {
        asked.add(kind);
        meet.quiz = crashQuiz(top.rock, rock, result);
      }
      frames.push(meet);
      first = false;

      if (result === "apart") {
        const passing = top.rock < 0 && rock > 0;
        const trap = passing && (practice || !shownTrap);
        if (passing) shownTrap = true;
        frames.push({
          scene,
          caption: trap
            ? `The Passing Ships Trap: ${show(top.rock)} and ${show(rock)} have opposite arrows, but they fly apart. No crash: ${show(rock)} joins the survivors.`
            : `They fly the same way, so they never meet. ${show(rock)} joins the survivors.`,
          codeLine: line(trap ? 3 : 10),
          state: lane(rocks, [...pile, { rock, from: index }], { pointer: index, gone, extra: trap ? { note: { text: "✕ opposite arrows are not enough", tone: "coral" } } : {} }),
        });
        break;
      }
      moves += 1;
      if (result === "top") {
        pile.splice(pile.length - 1, 1);
        gone.add(top.from);
        frames.push({
          scene,
          caption: `Crash. ${show(top.rock)} is smaller than ${show(rock)}, so the top survivor explodes.`,
          codeLine: line(4),
          state: lane(rocks, pile, { pointer: index, gone }),
        });
        continue;
      }
      if (result === "both") {
        pile.splice(pile.length - 1, 1);
        gone.add(top.from);
      }
      gone.add(index);
      alive = false;
      frames.push({
        scene,
        caption: result === "both" ? `Crash. ${show(top.rock)} and ${show(rock)} are the same size, so both explode.` : `Crash. ${show(rock)} is smaller than ${show(top.rock)}, so the incoming asteroid explodes.`,
        codeLine: line(result === "both" ? 6 : 7),
        state: lane(rocks, pile, { pointer: index, gone }),
      });
      break;
    }
    if (alive) pile.push({ rock, from: index });
  }

  const answer = list(pile.map((entry) => entry.rock));
  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}Every asteroid has come in. Read the survivor pile from bottom to top: the answer is ${answer}.`,
    codeLine: line(14),
    state: lane(rocks, pile, { gone, extra: { result: `answer: ${answer}` } }),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each asteroid joins the survivor pile once and leaves it at most once. Here there ${moves === 1 ? "was 1 crash" : `were ${moves} crashes`} for ${rocks.length} asteroids.`,
      codeLine: 3,
      state: lane(rocks, pile, { gone, extra: { counter: { label: "crashes", value: moves } } }),
    });
    frames.push({
      scene,
      caption: "Space: O(n). When nothing crashes, every asteroid sits on the survivor pile.",
      codeLine: 0,
      state: lane(rocks, pile, { gone }),
    });
  }
  return frames;
}

export const asteroidCollisionStory: ProblemStory<StackLaneState> = {
  slugs: ["lc-735"],
  pattern: "Stack",
  trigger: "things moving in a row that meet and destroy each other",
  insight: "Keep the survivors in a stack. Only a left-mover arriving after a right-mover on top can crash, and it keeps crashing into the new top until one side is gone.",
  metaphor: {
    name: "The crash lane",
    legend: "lane = asteroids · survivor pile = stack · top survivor = the stack's top · incoming = rock",
    terms: ["survivor", "asteroid", "crash", "lane"],
  },
  traps: [{ name: "The Passing Ships Trap", rule: "Opposite signs are not enough. A crash needs the top to move right and the new one to move left." }],
  template: [
    "for each item:",
    "    while it can hit the top of the stack:",
    "        the loser leaves (both on a tie);",
    "    if it is still alive, push it;",
    "read the stack from bottom to top;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each asteroid joins the pile once and leaves at most once",
    space: "O(n)",
    spaceWhy: "the survivor pile can hold every asteroid",
  },
  code: CODE,
  examples: [
    { label: "[5,10,-5]", input: "5,10,-5", expected: "[5,10]" },
    { label: "[10,2,-5]", input: "10,2,-5", expected: "[10]", note: "One asteroid destroys another, then explodes" },
    { label: "[8,-8]", input: "8,-8", expected: "[]", note: "Same size" },
    { label: "[-2,-1,1,-2]", input: "-2,-1,1,-2", expected: "[-2,-1,-2]", note: "Tricky: asteroids flying apart" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-739", title: "Daily Temperatures" },
    { slug: "lc-20", title: "Valid Parentheses" },
    { slug: "lc-150", title: "Evaluate Reverse Polish Notation" },
  ],
  answer: (input) => list(survivors(parseInput(input))),
  frames: (input) => {
    const rocks = parseInput(input);
    const answer = survivors(rocks);
    return [
      ...pictureFrames(rocks),
      ...slowFrames(rocks),
      ...insightFrames(rocks),
      ...solutionFrames(rocks),
      ...solutionFrames(parseInput(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a pile of survivors, and each left-flier fighting the top until one side is gone. Say the idea in your head first, then reveal the card.",
        state: lane(rocks, [], { extra: { stack: answer.map(show), stackTones: tones(answer.length, () => "done"), result: `answer: ${list(answer)}` } }),
      },
    ];
  },
  View: StackLaneView,
};
