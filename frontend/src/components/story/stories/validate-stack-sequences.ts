import type { CellTone } from "@/components/learn/viz/primitives";

import { StackLaneView, type StackLaneState } from "../rec02-stack-lane-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StackLaneState>;

/** Fresh plates for the "your turn" run. One arrival frees two wanted plates in a row. */
const PRACTICE = "2,1,0 | 1,2,0";
const FALLBACK = { pushed: [1, 2, 3, 4, 5], popped: [4, 5, 3, 2, 1] };

const CODE = [
  "Deque<Integer> pile = new ArrayDeque<>();",
  "int want = 0;",
  "for (int plate : pushed) {",
  "    pile.addLast(plate);",
  "    while (!pile.isEmpty() && pile.peekLast() == popped[want]) {",
  "        pile.removeLast();",
  "        want++;",
  "    }",
  "}",
  "return pile.isEmpty();",
];

function parseInput(raw: string): { pushed: number[]; popped: number[] } {
  const [first = "", second = ""] = raw.split("|");
  const pushed = (first.match(/-?\d+/g) ?? []).map(Number);
  const popped = (second.match(/-?\d+/g) ?? []).map(Number);
  if (pushed.length === 0 || pushed.length !== popped.length) return FALLBACK;
  return { pushed, popped };
}

/** An independent check: try the one rule "pop whenever the top is wanted" with plain arrays. */
function possible(pushed: number[], popped: number[]): boolean {
  const pile: number[] = [];
  let want = 0;
  for (const plate of pushed) {
    pile.splice(pile.length, 0, plate);
    while (pile.length > 0 && pile[pile.length - 1] === popped[want]) {
      pile.splice(pile.length - 1, 1);
      want += 1;
    }
  }
  return pile.length === 0;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

type Snapshot = { next: number; want: number; pile: number[] };

function picture(pushed: number[], popped: number[], snap: Snapshot, extra: Partial<StackLaneState> = {}, topTone: CellTone | null = null): StackLaneState {
  const n = pushed.length;
  return {
    rows: [
      {
        label: "arrive",
        items: pushed.map(String),
        tones: tones(n, (index) => (index < snap.next ? "faded" : null)),
        pointer: snap.next < n ? snap.next : null,
        pointerLabel: "next",
      },
      {
        label: "wanted",
        items: popped.map(String),
        tones: tones(n, (index) => (index < snap.want ? "done" : index === snap.want ? "window" : null)),
        pointer: snap.want < n ? snap.want : null,
        pointerLabel: "wanted",
      },
    ],
    stack: snap.pile.map(String),
    stackTones: tones(snap.pile.length, (index) => (index === snap.pile.length - 1 && topTone ? topTone : null)),
    stackLabel: "pile",
    ...extra,
  };
}

function pictureFrames(pushed: number[], popped: number[]): Frame[] {
  const empty: Snapshot = { next: 0, want: 0, pile: [] };
  const demo: Snapshot = { next: Math.min(2, pushed.length), want: 0, pile: pushed.slice(0, 2) };
  const answer = possible(pushed, popped);
  return [
    {
      scene: "picture",
      caption: `Plates arrive in this order: ${pushed.join(", ")}. Each one must go onto a pile, in that order.`,
      state: { ...picture(pushed, popped, empty), rows: picture(pushed, popped, empty).rows.slice(0, 1) },
    },
    {
      scene: "picture",
      caption: `The wanted row is the order the plates must come off: ${popped.join(", ")}.`,
      state: picture(pushed, popped, empty),
    },
    {
      scene: "picture",
      caption: "Allowed: take the top plate off at any time. Not allowed: pull a plate out from under another one.",
      state: picture(pushed, popped, demo, { note: demo.pile.length > 1 ? { text: `✕ ${demo.pile[0]} cannot come out from under ${demo.pile[1]}`, tone: "coral" } : null }),
    },
    {
      scene: "picture",
      caption: "The goal: say true if the plates can come off in exactly the wanted order, and false if they cannot.",
      state: picture(pushed, popped, empty, { result: `answer: ${answer}` }),
    },
  ];
}

/** The slow way: for each wanted plate, check the top, else search the whole pile. */
function slowFrames(pushed: number[], popped: number[]): Frame[] {
  const n = pushed.length;
  const frames: Frame[] = [];
  const pile: number[] = [];
  let next = 0;
  let reads = 0;
  let answer = true;
  for (let want = 0; want < n; want++) {
    const plate = popped[want];
    const prefix = want === 0 ? "The slow way, one wanted plate at a time. " : "";
    let caption: string;
    reads += 1;
    if (pile.length > 0 && pile[pile.length - 1] === plate) {
      pile.splice(pile.length - 1, 1);
      caption = `${prefix}Plate ${plate} is wanted and it is on top. Take it off.`;
    } else {
      const searched = pile.length;
      reads += searched;
      if (pile.includes(plate)) {
        answer = false;
        frames.push({
          scene: "slow",
          caption: `${prefix}Plate ${plate} is wanted. We search the whole pile and find it buried, so the order is impossible.`,
          state: picture(pushed, popped, { next, want, pile: [...pile] }, { counter: { label: "plates checked", value: reads }, note: { text: `✕ ${plate} is buried`, tone: "coral" } }),
        });
        break;
      }
      while (next < n && pushed[next] !== plate) pile.splice(pile.length, 0, pushed[next++]);
      if (next === n) {
        answer = false;
        break;
      }
      next += 1;
      caption = searched === 0
        ? `${prefix}Plate ${plate} is wanted. The pile is empty, so plates arrive until ${plate} comes and leaves.`
        : `${prefix}Plate ${plate} is wanted. We search all ${searched} plates on the pile first. It is not there, so plates arrive until ${plate} comes and leaves.`;
    }
    frames.push({ scene: "slow", caption, state: picture(pushed, popped, { next, want: want + 1, pile: [...pile] }, { counter: { label: "plates checked", value: reads } }) });
  }
  frames.push({
    scene: "slow",
    caption: `The answer is ${answer}, after ${reads} plate checks. Each search can read the whole pile, for every wanted plate: O(n²) time.`,
    state: { ...picture(pushed, popped, { next: n, want: n, pile: [] }), counter: { label: "plates checked", value: reads } },
  });
  return frames;
}

type Moment = Snapshot & { plate: number };

/** The first time the top of the pile is the wanted plate, found by running the real loop. */
function firstMatch(pushed: number[], popped: number[]): Moment | null {
  // Nothing can come off before the first match, so the wanted plate is still the first one.
  const pile: number[] = [];
  for (let next = 0; next < pushed.length; next++) {
    pile.splice(pile.length, 0, pushed[next]);
    if (pushed[next] === popped[0]) return { next: next + 1, want: 0, pile: [...pile], plate: pushed[next] };
  }
  return null;
}

function insightFrames(pushed: number[], popped: number[]): Frame[] {
  const moment = firstMatch(pushed, popped);
  if (!moment) return [];
  const below = moment.pile.length > 1 ? moment.pile[moment.pile.length - 2] : null;
  return [
    {
      scene: "insight",
      caption: `Picture the pile. Plate ${moment.plate} is on top, and it is the next wanted plate. Taking it off right now is always safe.`,
      state: picture(pushed, popped, moment, {}, "hit"),
    },
    {
      scene: "insight",
      caption: `Waiting would only bury it. The next plate to arrive would land on top of ${moment.plate}, and every plate has a different number.`,
      state: picture(pushed, popped, moment, { note: { text: `✕ do not bury ${moment.plate}`, tone: "coral" } }, "miss"),
    },
    {
      scene: "insight",
      caption: below !== null
        ? `After it comes off, check the new top, ${below}, the same way. When no plate fits and none are left to arrive, the rest are stuck.`
        : "After it comes off, check the new top the same way. When no plate fits and none are left to arrive, the rest are stuck.",
      state: picture(pushed, popped, { ...moment, want: moment.want + 1, pile: moment.pile.slice(0, -1) }),
    },
  ];
}

type Kind = "pop" | "wait" | "stop";

function moveQuiz(top: number, wanted: number, kind: Kind): StoryQuiz {
  return {
    kind: "choice",
    question: `Plate ${top} is on top. The wanted plate is ${wanted}. What now?`,
    options: ["Take the top plate off", "Wait for the next plate to arrive", "Stop: the order is impossible"],
    answer: kind === "pop" ? 0 : kind === "wait" ? 1 : 2,
    why:
      kind === "pop"
        ? "The top is the wanted plate, so it comes off right away."
        : kind === "wait"
          ? "The top is not wanted yet, and more plates can still arrive."
          : "No more plates will arrive, and the top is not the wanted one. It can never come off in time.",
  };
}

function solutionFrames(pushed: number[], popped: number[], scene: SceneId = "solution", practice = false): Frame[] {
  const n = pushed.length;
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = new Set<Kind>();
  const pile: number[] = [];
  let want = 0;
  let shownTrap = false;
  const snap = (next: number): Snapshot => ({ next, want, pile: [...pile] });

  frames.push({
    scene,
    caption: practice
      ? `Your turn. Plates arrive as ${pushed.join(", ")}, and the wanted order is ${popped.join(", ")}. You decide each move.`
      : `The pile starts empty. The wanted arrow points at plate ${popped[0]}.`,
    codeLine: line(1),
    state: picture(pushed, popped, snap(0)),
  });

  /** A frame where the top of the pile meets the wanted plate: the reader's decision. */
  const decide = (frame: Frame, next: number) => {
    const top = pile[pile.length - 1];
    const kind: Kind = top === popped[want] ? "pop" : next < n ? "wait" : "stop";
    if (practice || !asked.has(kind)) {
      asked.add(kind);
      frame.quiz = moveQuiz(top, popped[want], kind);
    }
    frames.push(frame);
  };

  for (let next = 0; next < n; next++) {
    const plate = pushed[next];
    pile.splice(pile.length, 0, plate);
    decide(
      {
        scene,
        caption: `Plate ${plate} arrives and goes on top of the pile. The wanted plate is ${popped[want]}.`,
        codeLine: line(3),
        state: picture(pushed, popped, snap(next + 1)),
      },
      next + 1,
    );
    let pops = 0;
    while (pile.length > 0 && pile[pile.length - 1] === popped[want]) {
      const off = pile[pile.length - 1];
      pile.splice(pile.length - 1, 1);
      want += 1;
      pops += 1;
      const trap = pops > 1;
      const after = want < n ? `Now plate ${popped[want]} is wanted.` : "Every wanted plate is off.";
      frames.push({
        scene,
        caption:
          trap && (!shownTrap || practice)
            ? `The One-Pop Trap: stopping after one plate would bury ${off} under the next arrival. Keep going: take ${off} off too.`
            : `Plate ${off} is the wanted one. Take it off the top. ${after}`,
        codeLine: line(5),
        state: picture(pushed, popped, snap(next + 1), trap && (!shownTrap || practice) ? { note: { text: "✕ do not stop after one plate", tone: "coral" } } : {}),
      });
      if (trap) shownTrap = true;
      if (pile.length > 0) {
        decide(
          {
            scene,
            caption: `The top plate is now ${pile[pile.length - 1]}. The wanted plate is ${want < n ? popped[want] : "none"}.`,
            codeLine: line(4),
            state: picture(pushed, popped, snap(next + 1)),
          },
          next + 1,
        );
      }
    }
  }

  const ok = pile.length === 0;
  frames.push({
    scene,
    caption: ok
      ? `${practice ? "Done. " : ""}Every plate came off in the wanted order. The pile is empty, so the answer is true.`
      : `${practice ? "Done. " : ""}No plates are left to arrive, and plate ${popped[want]} is stuck under the top. The answer is false.`,
    codeLine: line(9),
    state: picture(pushed, popped, snap(n), { result: `answer: ${ok}`, note: ok ? null : { text: `✕ ${popped[want]} is buried`, tone: "coral" } }, ok ? null : "miss"),
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${n} plates goes on the pile once and comes off at most once. No searching.`,
      codeLine: 2,
      state: { ...picture(pushed, popped, snap(n)), counter: { label: "plates moved", value: n + want } },
    });
    frames.push({
      scene,
      caption: "Space: O(n). The pile can hold every plate, when the wanted order is the arrival order reversed.",
      codeLine: 0,
      state: picture(pushed, popped, { next: n, want: 0, pile: [...pushed] }),
    });
  }
  return frames;
}

export const validateStackSequencesStory: ProblemStory<StackLaneState> = {
  slugs: ["lc-946"],
  pattern: "Stack simulation",
  trigger: "a push order and a pop order, and “could this really happen?”",
  insight: "Act it out with a real pile. Push in order, and every time the top plate is the one the pop list wants next, take it off.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = stack · plate = a value · arrive row = pushed · wanted row = popped · wanted arrow = want",
    terms: ["plate", "pile", "wanted", "top"],
  },
  traps: [{ name: "The One-Pop Trap", rule: "After a push, keep popping while the top matches. One pop and then a push can miss a chain of wanted plates." }],
  template: [
    "for each arriving value:",
    "    push it;",
    "    while the top is the next wanted value: pop it, move the wanted arrow;",
    "return the stack is empty;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each plate goes on once and comes off at most once",
    space: "O(n)",
    spaceWhy: "the pile can hold every plate",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5] → [4,5,3,2,1]", input: "1,2,3,4,5 | 4,5,3,2,1", expected: "true" },
    { label: "[1,2,3,4,5] → [4,3,5,1,2]", input: "1,2,3,4,5 | 4,3,5,1,2", expected: "false", note: "A plate gets buried" },
    { label: "[1,2,3] → [3,1,2]", input: "1,2,3 | 3,1,2", expected: "false" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-155", title: "Min Stack" },
    { slug: "lc-20", title: "Valid Parentheses" },
    { slug: "lc-84", title: "Largest Rectangle in Histogram" },
  ],
  answer: (input) => {
    const { pushed, popped } = parseInput(input);
    return String(possible(pushed, popped));
  },
  frames: (input) => {
    const { pushed, popped } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const n = pushed.length;
    return [
      ...pictureFrames(pushed, popped),
      ...slowFrames(pushed, popped),
      ...insightFrames(pushed, popped),
      ...solutionFrames(pushed, popped),
      ...solutionFrames(practice.pushed, practice.popped, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: plates land on the pile, and the wanted ones come off the top in a chain. Say the idea in your head first, then reveal the card.",
        state: picture(pushed, popped, { next: n, want: 0, pile: [] }, { result: `answer: ${possible(pushed, popped)}` }),
      },
    ];
  },
  View: StackLaneView,
};
