import type { CellTone } from "@/components/learn/viz/primitives";

import { TrackView, type TrackRunner, type TrackState } from "../rec04-track-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TrackState>;

/** Fresh list for the "your turn" run. Even length, so it reaches the First Middle Trap. */
const PRACTICE = "[2,4,6,8]";

const CODE = [
  "ListNode slow = head;",
  "ListNode fast = head;",
  "while (fast != null && fast.next != null) {",
  "    slow = slow.next;",
  "    fast = fast.next.next;",
  "}",
  "return slow;",
];

function parse(input: string): number[] {
  const values = input
    .replace(/[[\]\s]/g, "")
    .split(",")
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
  return values.length ? values : [1];
}

/** Independent solver: count, then take index n / 2 (the second middle on even lists). */
function solve(values: number[]): string {
  return `[${values.slice(Math.floor(values.length / 2)).join(",")}]`;
}

/** The real loop on indices. `fast === n` means the hare stands on null. */
function race(n: number): { slow: number; fast: number } {
  let slow = 0;
  let fast = 0;
  while (fast < n && fast + 1 < n) {
    slow += 1;
    fast += 2;
  }
  return { slow, fast };
}

const listText = (values: number[], from = 0) => `[${values.slice(from).join(",")}]`;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function base(values: number[], runners: TrackRunner[], paint: (index: number) => CellTone | null = () => null): TrackState {
  return { nodes: values.map(String), pos: -1, nullBox: true, tones: values.map((_, index) => paint(index) ?? "idle"), runners };
}

function runnersAt(slow: number | null, fast: number | null): TrackRunner[] {
  const out: TrackRunner[] = [];
  if (slow !== null) out.push({ name: "tortoise", at: slow, tone: "accent" });
  if (fast !== null) out.push({ name: "hare", at: fast, tone: "ink" });
  return out;
}

function pictureFrames(values: number[]): Frame[] {
  const n = values.length;
  const middle = Math.floor(n / 2);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `This is a linked list of ${plural(n, "node")}. Each arrow points to the next node. The last arrow points to null: the end.`,
      state: base(values, []),
    },
  ];
  if (n % 2 === 1) {
    frames.push({
      scene: "picture",
      caption: n === 1 ? "With one node, that node is the middle." : `The middle node is ${values[middle]}. There are ${middle} nodes before it and ${middle} after it.`,
      state: base(values, [], (index) => (index === middle ? "done" : null)),
    });
  } else {
    frames.push({
      scene: "picture",
      caption: `With ${n} nodes there are two middles, ${values[middle - 1]} and ${values[middle]}. We want the second one, the node ${values[middle]}.`,
      state: base(values, [], (index) => (index === middle ? "done" : index === middle - 1 ? "window" : null)),
    });
  }
  frames.push({
    scene: "picture",
    caption: `We only hold the first node, and nobody tells us the length. The goal: return the middle node, which shows as ${solve(values)}.`,
    state: base(values, [], (index) => (index >= middle ? "done" : null)),
  });
  return frames;
}

/** The obvious way, really run: copy every node into a notebook, then pick the middle entry. */
function slowFrames(values: number[]): Frame[] {
  const n = values.length;
  const frames: Frame[] = [];
  const notebook: number[] = [];
  let copied = 0;
  for (let at = 0; at < n; at++) {
    notebook.push(at);
    copied++;
    if (at > 2 && at < n - 1) continue;
    frames.push({
      scene: "slow",
      caption:
        at === 0
          ? "The slow way: walk the list and copy every node into a notebook."
          : at === n - 1
            ? `The walk reaches the last node. All ${plural(n, "node")} are in the notebook.`
            : `Copy the node ${values[at]} too.`,
      state: {
        ...base(values, [{ name: "walker", at, tone: "accent" }], (index) => (index < at ? "window" : index === at ? "edge" : null)),
        notebook: [...notebook],
        counter: { label: "nodes copied", value: copied },
      },
    });
  }
  const middle = Math.floor(n / 2);
  frames.push({
    scene: "slow",
    caption: `Now the notebook shows the length, so its middle entry is easy: the node ${values[middle]}.`,
    state: { ...base(values, [], (index) => (index === middle ? "done" : null)), notebook: [...notebook], notebookHit: middle, counter: { label: "nodes copied", value: copied } },
  });
  frames.push({
    scene: "slow",
    caption: `That takes O(n) time, but the notebook needs room for every node: O(n) extra space. Can we find the middle with no notebook?`,
    state: { ...base(values, [], () => "faded"), notebook: [...notebook], counter: { label: "nodes copied", value: copied } },
  });
  return frames;
}

function insightFrames(values: number[]): Frame[] {
  const n = values.length;
  const { slow, fast } = race(n);
  const ended = fast === n ? "jumps off the end onto null" : "stands on the last node";
  return [
    {
      scene: "insight",
      caption: "Picture a tortoise and a hare, both starting on the first node. The tortoise walks one node at a time. The hare jumps two.",
      state: base(values, runnersAt(0, 0)),
    },
    {
      scene: "insight",
      caption: `The hare always covers twice the ground. So when the hare ${ended}, the tortoise has covered half: it stands in the middle.`,
      state: base(values, runnersAt(slow, fast), (index) => (index === slow ? "done" : null)),
    },
    {
      scene: "insight",
      caption: "No counting and no notebook. Two runners, one walk.",
      state: base(values, runnersAt(slow, fast), (index) => (index === slow ? "done" : index < slow ? "window" : null)),
    },
  ];
}

function hareQuiz(n: number, values: number[], slow: number, fast: number): StoryQuiz {
  const answer = fast + 2;
  const feedback: Record<number, string> = { [fast + 1]: "That is only one arrow. The hare jumps two nodes each round." };
  if (slow !== fast + 1 && slow !== answer) feedback[slow] = "That is where the tortoise is. The hare jumps further.";
  if (fast !== answer) feedback[fast] = "The hare cannot stay still. It jumps two nodes.";
  return {
    kind: "cell",
    cells: n + 1,
    question: "The tortoise walks one node and the hare jumps two. Where does the hare land? Click that box.",
    answer,
    feedback,
    otherwise: "Start where the hare stands and count two arrows forward.",
    why: answer === n ? "Two arrows from the hare lead off the last node, onto null." : `Two arrows from ${values[fast]} lead to ${values[answer]}.`,
  };
}

const goOnQuiz = (values: number[], fast: number): StoryQuiz => ({
  kind: "choice",
  question: `The hare is on ${values[fast]}. One node follows it, and nothing comes after that. Does the race go on?`,
  options: ["Yes: the hare stands on a node, and a node follows it", "No: there is nothing two nodes ahead, so stop"],
  answer: 0,
  why: "The rule only asks two things: is the hare on a node, and is there a node after it? Both are true, so one more round.",
});

/** The reveal after "does the race go on?": what stopping now would cost. */
function trapFrame(scene: SceneId, values: number[], slow: number, fast: number, codeLine?: number): Frame {
  return {
    scene,
    caption: `Yes, go on. Stopping here is the First Middle Trap: the tortoise would stay on ${values[slow]}, the first middle, one node short.`,
    ...(codeLine === undefined ? {} : { codeLine }),
    state: { ...base(values, runnersAt(slow, fast), (index) => (index === slow ? "miss" : null)), alert: "✕ stopping now is one round early" },
  };
}

function solutionFrames(values: number[]): Frame[] {
  const n = values.length;
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  let slow = 0;
  let fast = 0;
  let rounds = 0;
  let askedHare = false;
  const trail = (index: number) => (index < slow ? "window" : index === slow ? "edge" : null);
  const counter = () => ({ label: "rounds", value: rounds });

  frames.push({ scene, caption: `The tortoise starts on the first node, ${values[0]}.`, codeLine: 0, state: base(values, runnersAt(0, null), trail) });
  frames.push({ scene, caption: "The hare starts on the same node, next to the tortoise.", codeLine: 1, state: base(values, runnersAt(0, 0), trail) });

  while (fast < n && fast + 1 < n) {
    const lastJump = fast + 2 === n;
    const check: Frame = {
      scene,
      caption: rounds === 0 ? `The hare is on ${values[fast]} and a node follows it, so the hare can jump. A new round begins.` : `The hare is on ${values[fast]}, and a node follows it.`,
      codeLine: 2,
      state: { ...base(values, runnersAt(slow, fast), trail), counter: counter() },
    };
    if (lastJump) check.quiz = goOnQuiz(values, fast);
    frames.push(check);
    if (lastJump) {
      const trap = trapFrame(scene, values, slow, fast, 2);
      frames.push({ ...trap, state: { ...trap.state, counter: counter() } });
    }
    slow += 1;
    const walked: Frame = { scene, caption: `The tortoise walks one node, to ${values[slow]}.`, codeLine: 3, state: { ...base(values, runnersAt(slow, fast), trail), counter: counter() } };
    if (!askedHare) {
      walked.quiz = hareQuiz(n, values, slow, fast);
      askedHare = true;
    }
    frames.push(walked);
    const hop = [fast, fast + 1];
    fast += 2;
    rounds += 1;
    frames.push({
      scene,
      caption: fast === n ? "The hare jumps two nodes, off the end and onto null." : `The hare jumps two nodes, to ${values[fast]}.`,
      codeLine: 4,
      state: { ...base(values, runnersAt(slow, fast), trail), hop, counter: counter() },
    });
  }

  frames.push({
    scene,
    caption: fast === n ? "The hare is on null. It has run out of list, so the race stops." : `The hare is on the last node, ${values[fast]}. Nothing follows it, so the race stops.`,
    codeLine: 2,
    state: { ...base(values, runnersAt(slow, fast), (index) => (index === slow ? "done" : index < slow ? "window" : null)), counter: counter() },
  });
  const answer = solve(values);
  if (answer !== listText(values, slow)) throw new Error("middle-of-linked-list: the race disagrees with the solver");
  frames.push({
    scene,
    caption: `The tortoise stands on ${values[slow]}, the middle. The answer is ${answer}: that node and the ones after it.`,
    codeLine: 6,
    state: { ...base(values, runnersAt(slow, null), (index) => (index >= slow ? "done" : null)), counter: counter() },
  });
  frames.push({
    scene,
    caption: `Time: O(n). The hare crosses the list once, two nodes per round: ${plural(rounds, "round")} for ${plural(n, "node")}.`,
    codeLine: 2,
    state: { ...base(values, runnersAt(slow, fast), (index) => (index === slow ? "done" : null)), counter: counter() },
  });
  frames.push({
    scene,
    caption: "Space: O(1). Only two runners, the tortoise and the hare, however long the list is. No notebook.",
    codeLine: 0,
    state: base(values, runnersAt(slow, fast), (index) => (index === slow ? "done" : null)),
  });
  return frames;
}

/** The reader moves the hare every round and decides whether the race goes on. */
function practiceFrames(): Frame[] {
  const values = parse(PRACTICE);
  const n = values.length;
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  let slow = 0;
  let fast = 0;
  const trail = (index: number) => (index < slow ? "window" : index === slow ? "edge" : null);
  frames.push({ scene, caption: `Your turn, on a new list: ${PRACTICE}. The tortoise and the hare start on ${values[0]}. You move the hare.`, state: base(values, runnersAt(0, 0), trail) });
  while (fast < n && fast + 1 < n) {
    if (fast + 2 === n) {
      frames[frames.length - 1].quiz = goOnQuiz(values, fast);
      frames.push(trapFrame(scene, values, slow, fast));
      frames.push({ scene, caption: "So one more round. Where does the hare land now?", state: base(values, runnersAt(slow, fast), trail), quiz: hareQuiz(n, values, slow, fast) });
    } else {
      frames[frames.length - 1].quiz = hareQuiz(n, values, slow, fast);
    }
    const hop = [fast, fast + 1];
    slow += 1;
    fast += 2;
    frames.push({
      scene,
      caption: fast === n ? `The hare lands on null, and the tortoise walks to ${values[slow]}.` : `The hare lands on ${values[fast]}, and the tortoise walks to ${values[slow]}.`,
      state: { ...base(values, runnersAt(slow, fast), trail), hop },
    });
  }
  frames.push({
    scene,
    caption: `The hare has run out of list. Done: the tortoise is on ${values[slow]}, so the answer is ${solve(values)}.`,
    state: base(values, runnersAt(slow, null), (index) => (index >= slow ? "done" : null)),
  });
  return frames;
}

export const middleOfLinkedListStory: ProblemStory<TrackState> = {
  slugs: ["lc-876"],
  pattern: "Fast and slow pointers",
  trigger: "“return the middle node of a linked list”, in one walk, when the length is not given",
  insight: "A tortoise and a hare start at the head. The hare jumps two nodes for every one the tortoise walks, so when the hare runs out of track the tortoise stands in the middle.",
  metaphor: { name: "The tortoise and the hare", legend: "tortoise = slow · hare = fast", terms: ["tortoise", "hare"] },
  traps: [{ name: "The First Middle Trap", rule: "Keep going while fast != null && fast.next != null. Stopping one jump early, when fast.next.next is null, leaves the tortoise on the first of two middles." }],
  template: ["slow = head; fast = head;", "while (fast can still jump two) {", "    slow one step; fast two steps;", "}", "answer = slow;"],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "the hare crosses the list once, two nodes per round",
    space: "O(1)",
    spaceWhy: "two runners, and no notebook of nodes",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5]", input: "[1,2,3,4,5]", expected: "[3,4,5]" },
    { label: "[1,2,3,4,5,6]", input: "[1,2,3,4,5,6]", expected: "[4,5,6]", note: "Tricky: two middles, return the second" },
    { label: "[1]", input: "[1]", expected: "[1]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-143", title: "Reorder List" },
    { slug: "lc-141", title: "Linked List Cycle" },
  ],
  answer: (input) => solve(parse(input)),
  frames: (input) => {
    const values = parse(input);
    const { slow, fast } = race(values.length);
    return [
      ...pictureFrames(values),
      ...slowFrames(values),
      ...insightFrames(values),
      ...solutionFrames(values),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: base(values, runnersAt(slow, fast), (index) => (index === slow ? "done" : null)),
      },
    ];
  },
  View: TrackView,
};
