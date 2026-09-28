import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type TrainFrame = StoryFrame<LinkedListReverseState>;

/** Fresh train for the "your turn" run. The span starts at the front car, so it reaches the Missing Engine Trap. */
const PRACTICE = "head=[6,1,8,3], left=1, right=3";

const CODE = [
  "ListNode dummy = new ListNode(0, head);",
  "ListNode anchor = dummy;",
  "for (int i = 1; i < left; i++) anchor = anchor.next;",
  "ListNode after = anchor.next;",
  "for (int i = left; i <= right; i++) after = after.next;",
  "ListNode prev = after;",
  "ListNode curr = anchor.next;",
  "for (int i = left; i <= right; i++) {",
  "    ListNode next = curr.next;",
  "    curr.next = prev;",
  "    prev = curr;",
  "    curr = next;",
  "}",
  "anchor.next = prev;",
  "return dummy.next;",
];

type Task = { values: number[]; left: number; right: number };

function parseTask(input: string): Task {
  const values = (input.match(/\[([^\]]*)\]/)?.[1] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const list = values.length ? values : [1, 2, 3, 4, 5];
  const clamp = (value: number) => Math.min(Math.max(Number.isInteger(value) ? value : 1, 1), list.length);
  const left = clamp(Number(input.match(/left\s*=\s*(-?\d+)/)?.[1] ?? 1));
  const right = Math.max(left, clamp(Number(input.match(/right\s*=\s*(-?\d+)/)?.[1] ?? list.length)));
  return { values: list, left, right };
}

/** Independent solver: plain array work, no links. */
function solve({ values, left, right }: Task): string {
  const out = [...values.slice(0, left - 1), ...values.slice(left - 1, right).reverse(), ...values.slice(right)];
  return `[${out.join(",")}]`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Cell 0 is the spare engine (the dummy node), cells 1..n are the cars, the last cell is null. */
type Snap = {
  links: (number | null)[];
  slots: number[];
  anchor: number | null;
  scout: number | null;
  hook: number | null;
  hand: number | null;
  flag: number | null;
  group: [number, number] | null;
  turned: number[];
  fresh: number | null;
  visits: number;
};

type StepKind = "engine" | "anchor" | "anchorMove" | "scout" | "hook" | "hand" | "flag" | "swing" | "hookMove" | "handMove" | "stitch" | "straight" | "done";

type Step = { kind: StepKind; snap: Snap; car: number; first: boolean; last: boolean; index: number };

type Run = { cells: TrainCell[]; steps: Step[]; answer: string; end: number };

/** The real algorithm, run on a links array. Every step keeps a copy of the yard at that moment. */
function simulate({ values, left, right }: Task): Run {
  const end = values.length + 1;
  const cells: TrainCell[] = [{ label: "engine", kind: "engine" }, ...values.map((value) => ({ label: String(value), kind: "car" as const })), { label: "null", kind: "null" }];
  const now: Snap = {
    links: cells.map((_, cell) => (cell === end ? null : cell + 1)),
    slots: cells.map((_, cell) => cell),
    anchor: null,
    scout: null,
    hook: null,
    hand: null,
    flag: null,
    group: null,
    turned: [],
    fresh: null,
    visits: 0,
  };
  const steps: Step[] = [];
  const record = (kind: StepKind, car = 0, first = false, last = false, index = 0) => {
    steps.push({ kind, car, first, last, index, snap: { ...now, links: [...now.links], slots: [...now.slots], turned: [...now.turned] } });
    now.fresh = null;
  };
  const next = (cell: number) => now.links[cell] ?? end;

  record("engine");
  now.anchor = 0;
  record("anchor");
  for (let i = 1; i < left; i++) {
    now.anchor = next(now.anchor);
    now.visits++;
  }
  now.group = [left, right];
  record("anchorMove");
  let after = next(now.anchor);
  for (let i = left; i <= right; i++) {
    after = next(after);
    now.visits++;
  }
  now.scout = after;
  record("scout");
  now.hook = after;
  record("hook");
  let car = next(now.anchor);
  const firstCar = car;
  now.hand = car;
  record("hand", car);
  for (let i = left; i <= right; i++) {
    const first = i === left;
    const last = i === right;
    now.flag = next(car);
    record("flag", car, first, last, i - left);
    now.links[car] = now.hook;
    now.turned.push(car);
    now.fresh = car;
    now.visits++;
    record("swing", car, first, last, i - left);
    now.hook = car;
    record("hookMove", car, first, last, i - left);
    now.hand = now.flag;
    record("handMove", car, first, last, i - left);
    car = now.flag;
  }
  now.flag = null;
  now.hand = null;
  const newFirst = now.hook;
  now.links[now.anchor] = newFirst;
  now.fresh = now.anchor;
  now.hook = null;
  record("stitch", newFirst ?? 0);
  // Pull the train straight: same couplings, each cell drawn in the order the couplings give.
  let slot = 0;
  for (let cell: number | null = 0; cell !== null && slot < cells.length; cell = now.links[cell]) now.slots[cell] = slot++;
  now.group = null;
  now.scout = null;
  record("straight", firstCar);
  const out: string[] = [];
  for (let cell = next(0); cell !== end && out.length <= cells.length; cell = next(cell)) out.push(cells[cell].label);
  record("done", firstCar);
  return { cells, steps, answer: `[${out.join(",")}]`, end };
}

function toState(run: Run, snap: Snap, show: ("hand" | "flag" | "hook" | "scout" | "anchor")[] = ["hand", "flag", "hook", "scout", "anchor"]): LinkedListReverseState {
  const tones: Record<string, TrainPointer["tone"]> = { hand: "accent", flag: "teal", hook: "ink", scout: "accent", anchor: "ink" };
  const pointers: TrainPointer[] = [];
  for (const name of ["hand", "flag", "hook", "scout", "anchor"] as const) {
    const at = snap[name];
    if (at !== null && show.includes(name)) pointers.push({ name, at, tone: tones[name] });
  }
  const handShown = show.includes("hand") ? snap.hand : null;
  return {
    cells: run.cells,
    slots: snap.slots,
    links: snap.links,
    tones: run.cells.map((cell, index): CellTone => (snap.turned.includes(index) ? "done" : index === handShown && cell.kind === "car" ? "edge" : "idle")),
    pointers,
    freshLink: snap.fresh,
    group: snap.group,
  };
}

/** Pictures without the engine, for the scenes before the algorithm starts. */
function plainTrain(values: number[], order: number[], paint: (index: number) => CellTone | null): LinkedListReverseState {
  const cells: TrainCell[] = [...values.map((value) => ({ label: String(value), kind: "car" as const })), { label: "null", kind: "null" }];
  const slots = cells.map((_, cell) => cell);
  const links: (number | null)[] = cells.map(() => null);
  order.forEach((index, place) => {
    slots[index] = place;
    links[index] = place + 1 < order.length ? order[place + 1] : values.length;
  });
  return { cells, slots, links, tones: cells.map((_, cell) => (cell < values.length ? (paint(cell) ?? "idle") : "idle")), pointers: [] };
}

function finalOrder({ values, left, right }: Task): number[] {
  const order = values.map((_, index) => index);
  return [...order.slice(0, left - 1), ...order.slice(left - 1, right).reverse(), ...order.slice(right)];
}

const inSpan = ({ left, right }: Task) => (index: number) => index >= left - 1 && index <= right - 1;

function pictureFrames(task: Task): TrainFrame[] {
  const { values, left, right } = task;
  const inOrder = values.map((_, index) => index);
  const span = values.slice(left - 1, right);
  const spanRange: [number, number] = [left - 1, right - 1];
  return [
    { scene: "picture", caption: `This train has ${plural(values.length, "car")}. Each car's coupling hooks onto the car ahead. The last car points at null, the end.`, state: plainTrain(values, inOrder, () => null) },
    {
      scene: "picture",
      caption: `Turn round only the cars from position ${left} to position ${right}, counting the front car as 1. That span is ${span.join(", ")}.`,
      state: { ...plainTrain(values, inOrder, (index) => (inSpan(task)(index) ? "window" : null)), group: spanRange },
    },
    {
      scene: "picture",
      caption: left === 1 ? "The span starts at the very front, so the front car of the train will change." : "Every car before and after the span stays exactly where it is.",
      state: { ...plainTrain(values, inOrder, (index) => (left === 1 ? (index === 0 ? "miss" : null) : inSpan(task)(index) ? null : "hit")), group: spanRange },
    },
    { scene: "picture", caption: `The goal: the train ${solve(task)}.`, state: plainTrain(values, finalOrder(task), (index) => (inSpan(task)(index) ? "done" : null)) },
  ];
}

/** The obvious way, really run: copy the numbers into a list, turn the span round there, and paint them back. */
function slowFrames(task: Task): TrainFrame[] {
  const { values, left, right } = task;
  const inOrder = values.map((_, index) => index);
  const copy = [...values];
  let work = values.length;
  const frames: TrainFrame[] = [
    {
      scene: "slow",
      caption: "The slow way: copy every car's number into a list on paper.",
      state: { ...plainTrain(values, inOrder, () => "window"), counter: { label: "numbers copied", value: work }, note: `copy: ${copy.join(" ")}` },
    },
  ];
  for (let i = left - 1, j = right - 1; i < j; i++, j--) [copy[i], copy[j]] = [copy[j], copy[i]];
  frames.push({
    scene: "slow",
    caption: `Turn the span round on paper. The list now reads ${copy.join(", ")}.`,
    state: { ...plainTrain(values, inOrder, (index) => (inSpan(task)(index) ? "edge" : null)), counter: { label: "numbers copied", value: work }, note: `copy: ${copy.join(" ")}` },
  });
  work += values.length;
  const painted = copy.map((value) => value);
  frames.push({
    scene: "slow",
    caption: "Walk the train again and paint the new numbers onto the cars. The couplings never moved.",
    state: { ...plainTrain(painted, inOrder, (index) => (inSpan(task)(index) ? "done" : null)), counter: { label: "numbers moved", value: work }, note: `copy: ${copy.join(" ")}` },
  });
  frames.push({
    scene: "slow",
    caption: `It works in O(n) time, but the paper copy holds every number: O(n) extra space. Can we turn the couplings instead?`,
    state: { ...plainTrain(painted, inOrder, () => "faded"), counter: { label: "numbers moved", value: work } },
  });
  return frames;
}

function insightFrames(run: Run): TrainFrame[] {
  const find = (kind: StepKind) => run.steps.find((step) => step.kind === kind)!;
  const turned = [...run.steps].reverse().find((step) => step.kind === "handMove")!;
  return [
    {
      scene: "insight",
      caption: "Park a spare engine in front of the train. Then the anchor walks to the car just before the span. There is always one, even for the front car.",
      state: toState(run, find("anchorMove").snap, ["anchor"]),
    },
    {
      scene: "insight",
      caption: "Turn the span round one coupling at a time. Its old first car becomes its last, so it holds the car after the span.",
      state: toState(run, turned.snap, ["anchor"]),
    },
    {
      scene: "insight",
      caption: "Then the anchor hooks onto the span's new first car. Pulled straight, the train is whole again.",
      state: toState(run, find("straight").snap, ["anchor"]),
    },
  ];
}

function anchorQuiz(run: Run, task: Task, answer: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  run.cells.forEach((_, cell) => {
    if (cell === answer) return;
    if (cell === task.left) feedback[cell] = "That is the span's first car. The anchor stands just before the span.";
    else if (cell === run.end) feedback[cell] = "The anchor stands on a car before the span, never on null.";
    else if (cell > task.left) feedback[cell] = "Too far. The anchor stops before the span begins.";
  });
  return {
    kind: "cell",
    cells: run.cells.length,
    question: `The span starts at position ${task.left}. The anchor must stand just before it. Where does the anchor stop? Click that box.`,
    answer,
    feedback,
    otherwise: "Count the cars from the front. Which box comes just before the span?",
    why: answer === 0 ? "The span starts at the front car, so only the spare engine is before it." : `The car ${run.cells[answer].label} sits just before the span.`,
  };
}

function swingQuiz(run: Run, step: Step): StoryQuiz {
  const { snap, car } = step;
  const answer = snap.hook ?? 0;
  const feedback: Record<number, string> = {
    [snap.flag ?? run.end]: "It points there already. The span is being turned round.",
    [snap.anchor ?? 0]: step.first ? "The anchor is before the span. This car will be the span's last, so it must hold what comes after." : "The anchor is hooked last of all, after the whole span is turned.",
    [car]: "A car cannot hook onto itself.",
  };
  delete feedback[answer];
  return {
    kind: "cell",
    cells: run.cells.length,
    question: `The coupling of the car ${run.cells[car].label} swings now. Where must it point? Click that box.`,
    answer,
    feedback,
    otherwise: step.first ? "This car will be the last of the span. What must the last car of the span hold on to?" : "Look at the car that was turned just before this one.",
    why: step.first ? "The span's first car becomes its last, so it holds what comes after the span." : `It hooks onto the car turned just before it, the car ${run.cells[answer].label}.`,
  };
}

function stitchQuiz(run: Run, snap: Snap, newFirst: number, oldFirst: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [oldFirst]: "The anchor holds that one now. But it is the span's last car now, so the rest of the span would be skipped.",
    [snap.anchor ?? 0]: "A car cannot hook onto itself.",
  };
  delete feedback[newFirst];
  return {
    kind: "cell",
    cells: run.cells.length,
    question: "The whole span is turned. Which box must the anchor hook onto now? Click it.",
    answer: newFirst,
    feedback,
    otherwise: "Which car is the span's new first car?",
    why: `The car ${run.cells[newFirst].label} is the span's new first car, so the anchor hooks onto it.`,
  };
}

const returnQuiz = (run: Run, oldHead: number): StoryQuiz => ({
  kind: "choice",
  question: "The span began at the front car. Which box starts the answer?",
  options: [`The car the spare engine points to`, `The old front car, ${run.cells[oldHead].label}`],
  answer: 0,
  why: "The front car changed. The spare engine always points to the true front, whatever happened.",
});

/** The trap as a picture: start from the old front car, and the cars in front of it are lost. */
function trapState(run: Run, snap: Snap, oldHead: number): LinkedListReverseState {
  const lost: number[] = [];
  for (let cell = snap.links[0] ?? run.end; cell !== oldHead && cell !== run.end && lost.length < run.cells.length; cell = snap.links[cell] ?? run.end) lost.push(cell);
  return { ...toState(run, snap, []), pointers: [{ name: "old head", at: oldHead, tone: "accent" }], lost, tones: run.cells.map((_, cell): CellTone => (lost.includes(cell) ? "miss" : cell === oldHead ? "edge" : "idle")) };
}

function trapCaption(run: Run, snap: Snap, oldHead: number, reveal: boolean): string {
  const lost = trapState(run, snap, oldHead).lost ?? [];
  const labels = lost.map((cell) => run.cells[cell].label);
  const names = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels.join("");
  return `${reveal ? "Start from the spare engine's next car. " : ""}Returning the old front car ${run.cells[oldHead].label} is the Missing Engine Trap: ${names} would be lost.`;
}

function solutionFrames(task: Task, run: Run): TrainFrame[] {
  const scene: SceneId = "solution";
  const frames: TrainFrame[] = [];
  const name = (cell: number | null) => (cell === null || cell === run.end ? "null" : cell === 0 ? "the spare engine" : `the car ${run.cells[cell].label}`);
  const push = (caption: string, codeLine: number, snap: Snap) => frames.push({ scene, caption, codeLine, state: toState(run, snap) });
  const ask = (quiz: StoryQuiz) => {
    frames[frames.length - 1].quiz = quiz;
  };
  const before = (step: Step) => run.steps[run.steps.indexOf(step) - 1].snap;
  let oldFirst = 1;
  let spanFirst = 1;

  for (const step of run.steps) {
    const { snap, car } = step;
    const detailed = step.index < 2;
    switch (step.kind) {
      case "engine":
        push("Park a spare engine in front of the train. Now even the front car has a car before it.", 0, snap);
        break;
      case "anchor":
        push("The anchor starts on the spare engine.", 1, snap);
        break;
      case "anchorMove":
        ask(anchorQuiz(run, task, snap.anchor ?? 0));
        push(
          task.left === 1 ? "The span starts at the front car, so the anchor stays on the spare engine. The band marks the span." : `The anchor walks forward and stops on ${name(snap.anchor)}, just before the span.`,
          2,
          snap,
        );
        break;
      case "scout":
        push(`The scout walks past the span and stops on ${name(snap.scout)}, the first box after it.`, 4, snap);
        break;
      case "hook":
        push(`The span's first car will become its last, so it must hold what comes after the span. Put the hook on ${name(snap.hook)}.`, 5, snap);
        break;
      case "hand":
        oldFirst = car;
        push(`The hand takes the span's first car, ${name(car)}.`, 6, snap);
        break;
      case "flag":
        if (detailed) push(`Flag first, so that nothing gets lost: plant it on ${name(snap.flag)}.`, 8, snap);
        break;
      case "swing":
        if (detailed) {
          if (step.first) ask(swingQuiz(run, { ...step, snap: before(step) }));
          push(step.first ? `The coupling of ${name(car)} swings to the hook. It reaches over the span to ${name(snap.links[car])}.` : `The coupling of ${name(car)} swings round to the hook, ${name(snap.links[car])}.`, 9, snap);
        }
        break;
      case "hookMove":
        if (detailed) push(`The hook moves up to ${name(car)}.`, 10, snap);
        break;
      case "handMove":
        if (detailed) push(step.last ? `The hand moves to the flag, ${name(snap.hand)}. That is past the span, so the span is turned.` : `The hand moves to the flag, ${name(snap.hand)}.`, 11, snap);
        else
          frames.push({
            scene,
            caption: `The same steps for ${name(car)}: flag ahead, coupling round to the hook, ${name(snap.links[car])}. Hook and hand step on.`,
            codeLine: 9,
            state: { ...toState(run, snap), freshLink: car },
          });
        break;
      case "stitch":
        spanFirst = car;
        ask(stitchQuiz(run, before(step), car, oldFirst));
        push(`The anchor lets go of ${name(oldFirst)} and hooks onto ${name(car)}, the span's new first car.`, 13, snap);
        break;
      case "straight":
        push("Pull the train straight. No coupling changes: it is the same train, drawn in order.", 13, snap);
        break;
      case "done": {
        if (run.answer !== solve(task)) throw new Error("reverse-linked-list-ii: the pictured couplings disagree with the solver");
        if (task.left === 1 && spanFirst !== oldFirst) {
          ask(returnQuiz(run, oldFirst));
          frames.push({ scene, caption: trapCaption(run, snap, oldFirst, true), codeLine: 14, state: trapState(run, snap, oldFirst) });
        }
        push(`Follow the couplings from the spare engine, car by car. The answer is ${run.answer}.`, 14, snap);
        frames.push({
          scene,
          caption: `Time: O(n). The anchor and the scout walk up to the end of the span once, and the hand turns each span car once: ${plural(snap.visits, "visit")}.`,
          codeLine: 7,
          state: { ...toState(run, snap), counter: { label: "car visits", value: snap.visits } },
        });
        frames.push({
          scene,
          caption: "Space: O(1). Only a spare engine and five markers, however long the train is. No paper copy.",
          codeLine: 0,
          state: toState(run, snap),
        });
        break;
      }
    }
  }
  return frames;
}

/** The reader places the anchor, swings every coupling, stitches the span in, and picks the answer's front. */
function practiceFrames(): TrainFrame[] {
  const scene: SceneId = "card";
  const task = parseTask(PRACTICE);
  const run = simulate(task);
  const frames: TrainFrame[] = [];
  const shown: ("hand" | "flag" | "scout" | "anchor")[] = ["hand", "flag", "scout", "anchor"];
  const name = (cell: number | null) => (cell === null || cell === run.end ? "null" : cell === 0 ? "the spare engine" : `the car ${run.cells[cell].label}`);
  const push = (caption: string, snap: Snap, quiz?: StoryQuiz) => frames.push({ scene, caption, state: toState(run, snap, shown), ...(quiz ? { quiz } : {}) });
  const before = (step: Step) => run.steps[run.steps.indexOf(step) - 1].snap;
  let oldFirst = 1;

  for (const step of run.steps) {
    const { snap, car } = step;
    switch (step.kind) {
      case "engine":
        push(`Your turn, on a new train: ${task.values.join(", ")}. Turn round positions ${task.left} to ${task.right}. You place the anchor and hook every coupling.`, snap);
        break;
      case "anchor":
        push("The spare engine is parked, and the anchor starts on it.", snap);
        break;
      case "anchorMove":
        frames[frames.length - 1].quiz = anchorQuiz(run, task, snap.anchor ?? 0);
        push(`The anchor stops on ${name(snap.anchor)}. The band marks the span.`, snap);
        break;
      case "hand":
        oldFirst = car;
        push(`The scout stops on ${name(snap.scout)}, just after the span. The hand takes the span's first car, ${name(car)}.`, snap);
        break;
      case "flag":
        if (!step.first) push(`The coupling of ${name(before(step).hook)} now points at ${name(snap.links[before(step).hook ?? 0])}. The hand steps on to ${name(car)}.`, { ...snap, fresh: before(step).hook });
        break;
      case "swing":
        frames[frames.length - 1].quiz = swingQuiz(run, { ...step, snap: before(step) });
        break;
      case "stitch":
        push(`The coupling of ${name(before(step).hook)} now points at ${name(before(step).links[before(step).hook ?? 0])}. The hand is past the span.`, { ...before(step), fresh: before(step).hook }, stitchQuiz(run, before(step), car, oldFirst));
        push(`The anchor now hooks onto ${name(car)}, the span's new first car.`, snap);
        break;
      case "straight":
        frames[frames.length - 1].quiz = returnQuiz(run, oldFirst);
        frames.push({ scene, caption: trapCaption(run, snap, oldFirst, true), state: trapState(run, snap, oldFirst) });
        break;
      case "done":
        push(`Done. Follow the couplings from the spare engine: the new train is ${run.answer}. You stitched it yourself.`, snap);
        break;
      default:
        break;
    }
  }
  return frames;
}

export const reverseLinkedListIIStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-92"],
  pattern: "Linked list: turn one span round",
  trigger: "“reverse the nodes from position left to position right”, and leave the rest of the list alone",
  insight: "Park a spare engine in front of the train. Stand on the car before the span, turn the span's couplings round one by one, then hook that car onto the span's new first car.",
  metaphor: {
    name: "The spare engine",
    legend: "spare engine = dummy · anchor = anchor · scout = after · hook = prev · hand = curr · flag = next",
    terms: ["car", "coupling", "train", "scout", "anchor", "hook", "hand", "flag", "engine", "span"],
  },
  traps: [{ name: "The Missing Engine Trap", rule: "Always put a spare engine (a dummy) before the head and return dummy.next. When left is 1 the front car changes, and returning the old head loses the new front cars." }],
  template: [
    "dummy before head; anchor = the node before position left;",
    "prev = the node after position right; curr = anchor.next;",
    "repeat (right - left + 1) times: turn curr's link to prev, step on;",
    "anchor.next = prev;",
    "answer starts after dummy;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "the anchor and scout walk to the end of the span once, and each span car is turned once",
    space: "O(1)",
    spaceWhy: "one spare engine and a handful of markers, and no paper copy",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5], 2 to 4", input: "head=[1,2,3,4,5], left=2, right=4", expected: "[1,4,3,2,5]" },
    { label: "[3,5], 1 to 2", input: "head=[3,5], left=1, right=2", expected: "[5,3]", note: "Tricky: the front car changes" },
    { label: "[1,2,3,4,5], 1 to 5", input: "head=[1,2,3,4,5], left=1, right=5", expected: "[5,4,3,2,1]", note: "The span is the whole train" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-206", title: "Reverse Linked List" },
    { slug: "lc-25", title: "Reverse Nodes in k-Group" },
    { slug: "lc-61", title: "Rotate List" },
  ],
  answer: (input) => solve(parseTask(input)),
  frames: (input) => {
    const task = parseTask(input);
    const run = simulate(task);
    return [
      ...pictureFrames(task),
      ...slowFrames(task),
      ...insightFrames(run),
      ...solutionFrames(task, run),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: plainTrain(task.values, finalOrder(task), (index) => (inSpan(task)(index) ? "done" : null)),
      },
    ];
  },
  View: LinkedListReverseView,
};
