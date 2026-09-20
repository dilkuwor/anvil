import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type TrainFrame = StoryFrame<LinkedListReverseState>;

/** Fresh train for the "your turn" run: one full group, then a leftover car (the trap). */
const PRACTICE = "head=[7,2,9,4], k=3";

const CODE = [
  "ListNode dummy = new ListNode(0, head);",
  "ListNode groupPrev = dummy;",
  "while (true) {",
  "    ListNode kth = groupPrev;",
  "    for (int i = 0; i < k && kth != null; i++) kth = kth.next;",
  "    if (kth == null) break;",
  "    ListNode groupNext = kth.next;",
  "    ListNode prev = groupNext;",
  "    ListNode curr = groupPrev.next;",
  "    while (curr != groupNext) {",
  "        ListNode next = curr.next;",
  "        curr.next = prev;",
  "        prev = curr;",
  "        curr = next;",
  "    }",
  "    ListNode oldHead = groupPrev.next;",
  "    groupPrev.next = kth;",
  "    groupPrev = oldHead;",
  "}",
  "return dummy.next;",
];

type Task = { values: number[]; k: number };

function parseTask(input: string): Task {
  const size = Number(input.match(/k\s*=\s*(-?\d+)/)?.[1] ?? 2);
  const list = input.match(/\[([^\]]*)\]/)?.[1] ?? input.split(/[;k]/)[0];
  const values = list
    .split(/->|,/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
  // A group of fewer than one car would never finish, so the smallest group is one car.
  return { values: values.length ? values : [1, 2, 3, 4, 5], k: Number.isInteger(size) && size >= 1 ? size : 1 };
}

/** Independent solver: the real algorithm on real nodes. */
type ListNode = { value: number; next: ListNode | null };

function solve({ values, k }: Task): string {
  let head: ListNode | null = null;
  for (let index = values.length - 1; index >= 0; index--) head = { value: values[index], next: head };
  const dummy: ListNode = { value: 0, next: head };
  let groupPrev = dummy;
  for (;;) {
    let kth: ListNode | null = groupPrev;
    for (let i = 0; i < k && kth !== null; i++) kth = kth.next;
    if (kth === null) break;
    const groupNext: ListNode | null = kth.next;
    let prev = groupNext;
    let curr = groupPrev.next;
    while (curr !== groupNext && curr !== null) {
      const next: ListNode | null = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    const oldHead = groupPrev.next!;
    groupPrev.next = kth;
    groupPrev = oldHead;
  }
  const out: number[] = [];
  for (let node = dummy.next; node !== null; node = node.next) out.push(node.value);
  return out.join("->");
}

/** The order the cars end up in, by plain counting. Only the slow way and the goal picture use it. */
function finalOrder({ values, k }: Task): number[] {
  const order: number[] = [];
  for (let start = 0; start < values.length; start += k) {
    const group = values.slice(start, start + k).map((_, offset) => start + offset);
    order.push(...(group.length === k ? group.reverse() : group));
  }
  return order;
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
  keep: number[];
  visits: number;
};

type StepKind = "engine" | "anchor" | "scout" | "short" | "trap" | "hook" | "hand" | "flag" | "swing" | "hookMove" | "handMove" | "stitch" | "straight" | "anchorMove" | "done";

type Step = { kind: StepKind; group: number; snap: Snap; car: number; first: boolean; last: boolean; counted: number };

type Run = { cells: TrainCell[]; steps: Step[]; answer: string; end: number };

/** The real algorithm, run on a links array. Every step keeps a copy of the yard at that moment. */
function simulate({ values, k }: Task): Run {
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
    keep: [],
    visits: 0,
  };
  const steps: Step[] = [];
  let groupIndex = 0;
  const record = (kind: StepKind, car = 0, first = false, last = false, counted = 0) => {
    steps.push({ kind, group: groupIndex, car, first, last, counted, snap: { ...now, links: [...now.links], slots: [...now.slots], turned: [...now.turned], keep: [...now.keep] } });
    now.fresh = null;
  };
  const next = (cell: number) => now.links[cell] ?? end;

  record("engine");
  let anchor = 0;
  now.anchor = anchor;
  record("anchor");
  for (;;) {
    let scout = anchor;
    const counted: number[] = [];
    for (let i = 0; i < k && scout !== end; i++) {
      scout = next(scout);
      if (scout !== end) counted.push(scout);
      now.visits++;
    }
    now.scout = scout;
    if (scout === end) {
      record("short", 0, false, false, counted.length);
      if (counted.length > 0) {
        now.keep = counted;
        record("trap", 0, false, false, counted.length);
      }
      break;
    }
    const kth = scout;
    const head = next(anchor);
    now.group = [now.slots[head], now.slots[kth]];
    record("scout");
    const groupNext = next(kth);
    now.hook = groupNext;
    record("hook");
    let car = head;
    now.hand = car;
    record("hand", head);
    while (car !== groupNext) {
      const first = car === head;
      const last = car === kth;
      now.flag = next(car);
      record("flag", car, first, last);
      now.links[car] = now.hook;
      now.turned.push(car);
      now.fresh = car;
      now.visits++;
      record("swing", car, first, last);
      now.hook = car;
      record("hookMove", car, first, last);
      now.hand = now.flag;
      record("handMove", car, first, last);
      car = now.flag;
    }
    now.hook = null;
    now.hand = null;
    now.flag = null;
    now.links[anchor] = kth;
    now.fresh = anchor;
    record("stitch", head);
    // Pull the train straight: same couplings, each cell drawn in the order the couplings give.
    let slot = 0;
    for (let cell: number | null = 0; cell !== null && slot < cells.length; cell = now.links[cell]) now.slots[cell] = slot++;
    now.group = null;
    now.scout = null;
    record("straight", head);
    anchor = head;
    now.anchor = anchor;
    record("anchorMove", head);
    groupIndex++;
  }
  now.scout = null;
  now.anchor = null;
  now.keep = [];
  // The answer is read by walking the couplings of the picture itself.
  const out: string[] = [];
  for (let cell = next(0); cell !== end && out.length <= cells.length; cell = next(cell)) out.push(cells[cell].label);
  record("done");
  return { cells, steps, answer: out.join("->"), end };
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
    tones: run.cells.map((cell, index): CellTone => (snap.keep.includes(index) ? "miss" : snap.turned.includes(index) ? "done" : index === handShown && cell.kind === "car" ? "edge" : "idle")),
    pointers,
    freshLink: snap.fresh,
    keep: snap.keep.length ? snap.keep : null,
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

function pictureFrames(task: Task): TrainFrame[] {
  const { values, k } = task;
  const count = values.length;
  const inOrder = values.map((_, index) => index);
  const full = Math.floor(count / k) * k;
  const left = count - full;
  const frames: TrainFrame[] = [
    { scene: "picture", caption: `This train has ${plural(count, "car")}. Each car's coupling hooks onto the car ahead. The last car points at null, the end.`, state: plainTrain(values, inOrder, () => null) },
  ];
  if (full > 0) {
    const group = values.slice(0, k);
    frames.push({
      scene: "picture",
      caption: `Turn the train round in groups of ${k}. The first group, ${group.join(", ")}, becomes ${[...group].reverse().join(", ")}.`,
      state: { ...plainTrain(values, inOrder, (index) => (index < k ? "done" : null)), group: [0, k - 1] },
    });
  }
  frames.push({
    scene: "picture",
    caption:
      left > 0
        ? `At the end only ${plural(left, "car")} ${left === 1 ? "is" : "are"} left: fewer than ${k}. A group that is too short stays exactly as it is.`
        : `Here every group is full. If fewer than ${k} cars were left at the end, they would stay exactly as they are.`,
    state: plainTrain(values, inOrder, (index) => (index >= full ? "miss" : null)),
  });
  frames.push({
    scene: "picture",
    caption: `The goal: the train ${solve(task)}.`,
    state: plainTrain(values, finalOrder(task), (index) => (index < full ? "done" : null)),
  });
  return frames;
}

/** The obvious way, really run: write the new train car by car, walking from the front to find each one. */
function slowWalk(task: Task): { frames: TrainFrame[]; walked: number } {
  const { values } = task;
  const inOrder = values.map((_, index) => index);
  const order = finalOrder(task);
  const frames: TrainFrame[] = [];
  const built: number[] = [];
  let walked = 0;
  order.forEach((target, round) => {
    for (let at = 0; at <= target; at++) walked++;
    built.push(values[target]);
    if (round > 2) return;
    const name = `the car ${values[target]}`;
    frames.push({
      scene: "slow",
      caption:
        round === 0
          ? `The slow way: write the new train car by car. Its first car is ${name}, so walk from the front to find it.`
          : round === 1
            ? `The next one is ${name}. Couplings only lead forward, so walk from the front again.`
            : `Then ${name}: from the front again. The same cars are walked past over and over.`,
      state: {
        ...plainTrain(values, inOrder, (index) => (index === target ? "edge" : index < target ? "window" : null)),
        counter: { label: "cars walked past", value: walked },
        note: `new train: ${built.join(" ")}`,
      },
    });
  });
  frames.push({
    scene: "slow",
    caption: `Every car costs one more walk from the front: ${walked} cars walked past for a train of ${values.length}. This is O(n²) time: far too slow for 5,000 cars.`,
    state: { ...plainTrain(values, inOrder, () => "faded"), counter: { label: "cars walked past", value: walked }, note: `new train: ${built.join(" ")}` },
  });
  return { frames, walked };
}

function insightFrames(task: Task, run: Run): TrainFrame[] {
  const find = (kind: StepKind) => run.steps.find((step) => step.kind === kind && step.group === 0);
  const scouted = find("scout");
  if (!scouted) {
    const short = run.steps.find((step) => step.kind === "short")!;
    return [
      {
        scene: "insight",
        caption: `Picture a train yard. Before a group is touched, a scout walks ${task.k} cars ahead to check that the group is full. Here it is not, so nothing is turned.`,
        state: toState(run, short.snap, ["scout", "anchor"]),
      },
    ];
  }
  const turned = [...run.steps].reverse().find((step) => step.kind === "handMove" && step.group === 0)!;
  const straight = find("straight")!;
  return [
    {
      scene: "insight",
      caption: `Picture a train yard. Before a group is touched, a scout walks ${task.k} cars ahead to check that the group is full.`,
      state: toState(run, scouted.snap, ["scout", "anchor"]),
    },
    {
      scene: "insight",
      caption: "A full group is turned round one coupling at a time. Its old first car becomes its last, and holds what comes after the group.",
      state: toState(run, turned.snap, ["scout", "anchor"]),
    },
    {
      scene: "insight",
      caption: "Then the anchor, the car before the group, hooks onto the group's new first car. Pulled straight, the train is whole again.",
      state: toState(run, straight.snap, ["anchor"]),
    },
  ];
}

function scoutQuiz(run: Run, snap: Snap, k: number, answer: number): StoryQuiz {
  const anchor = snap.anchor ?? 0;
  const short = answer === run.end;
  const feedback: Record<number, string> = {};
  run.cells.forEach((_, cell) => {
    if (cell === answer) return;
    if (cell === anchor) feedback[cell] = "That is the anchor itself. The scout counts the cars after it.";
    else if (snap.slots[cell] < snap.slots[anchor]) feedback[cell] = "That is behind the anchor. The scout only walks ahead.";
    else if (short) feedback[cell] = "The scout cannot stop there: it has not counted enough cars yet.";
    else if (snap.slots[cell] < snap.slots[answer]) feedback[cell] = "Not far enough. The scout counts every car of the group.";
    else feedback[cell] = "Too far. The scout stops as soon as the group is counted.";
  });
  return {
    kind: "cell",
    cells: run.cells.length,
    question: `The scout must walk ${plural(k, "car")} ahead of the anchor. Where does it end up? Click that box.`,
    answer,
    feedback,
    otherwise: "Start just after the anchor and count the cars one by one.",
    why: short ? "The train runs out first, so the scout ends up on null. Too few cars are left for a group." : `Counting from the anchor, the scout stops on the car ${run.cells[answer].label}. The group is full.`,
  };
}

function swingQuiz(run: Run, step: Step): StoryQuiz {
  const { snap, car } = step;
  const answer = snap.hook ?? 0;
  const feedback: Record<number, string> = {
    [snap.flag ?? run.end]: "It points there already. The group is being turned round.",
    [snap.anchor ?? 0]: "The anchor is before the group. This car will be the group's last, so it must hold what comes after the group.",
    [car]: "A car cannot hook onto itself.",
  };
  delete feedback[answer];
  return {
    kind: "cell",
    cells: run.cells.length,
    question: `The coupling of the car ${run.cells[car].label} swings now. Where must it point? Click that box.`,
    answer,
    feedback,
    otherwise: step.first ? "This car will be the last of its group. What must the last car of a group hold on to?" : "Look at the car that was turned just before this one.",
    why: step.first ? "The group's first car becomes its last, so it reaches over the group and holds what comes after it." : `It hooks onto the car turned just before it, the car ${run.cells[answer].label}.`,
  };
}

function stitchQuiz(run: Run, snap: Snap, k: number, oldHead: number, kth: number): StoryQuiz {
  const after = snap.links[oldHead] ?? run.end;
  const feedback: Record<number, string> = {
    [oldHead]: "The anchor holds that one now. But it is the group's last car now, so the rest of the group would be skipped.",
    [after]: "That would skip the whole group.",
    [snap.anchor ?? 0]: "A car cannot hook onto itself.",
  };
  delete feedback[kth];
  return {
    kind: "cell",
    cells: run.cells.length,
    question: `${k === 1 ? "The group is" : k === 2 ? "Both cars of the group are" : `All ${k} cars of the group are`} turned. Which box must the anchor hook onto now? Click it.`,
    answer: kth,
    feedback,
    otherwise: "Which car is the group's new first car?",
    why: `The car ${run.cells[kth].label} is the group's new first car, so the anchor hooks onto it.`,
  };
}

function solutionFrames(task: Task, run: Run, walked: number): TrainFrame[] {
  const scene: SceneId = "solution";
  const { k } = task;
  const frames: TrainFrame[] = [];
  const name = (cell: number | null) => (cell === null || cell === run.end ? "null" : cell === 0 ? "the spare engine" : `the car ${run.cells[cell].label}`);
  const push = (caption: string, codeLine: number, snap: Snap) => frames.push({ scene, caption, codeLine, state: toState(run, snap) });
  const ask = (quiz: StoryQuiz) => {
    frames[frames.length - 1].quiz = quiz;
  };
  const before = (step: Step) => run.steps[run.steps.indexOf(step) - 1].snap;
  let askedScout = false;
  let askedStitch = false;

  for (const step of run.steps) {
    const { snap, car } = step;
    const detailed = step.group === 0;
    switch (step.kind) {
      case "engine":
        push("Park a spare engine in front of the train. Now even the first group has a car before it.", 0, snap);
        break;
      case "anchor":
        push("The anchor is the car just before the next group. It starts on the spare engine.", 1, snap);
        break;
      case "scout":
        if (!askedScout) ask(scoutQuiz(run, before(step), k, snap.scout ?? 0));
        askedScout = true;
        push(`The scout walks ${plural(k, "car")} ahead of the anchor and stops on ${name(snap.scout)}. The group is full.`, 4, snap);
        break;
      case "short":
        ask(scoutQuiz(run, before(step), k, run.end));
        push(
          step.counted === 0 ? "The scout sets off, but null is right there. No cars are left, so the work is done." : `The scout sets off to count ${plural(k, "car")}, but reaches null after ${step.counted}. Too few cars are left.`,
          4,
          snap,
        );
        break;
      case "trap":
        push("The Leftover Reversal Trap is to turn these last cars anyway. A group that is too short stays exactly as it is, so stop here.", 5, snap);
        break;
      case "hook":
        push(
          detailed
            ? `This group's first car will be its last, so it must hold what comes after the group. Put the hook there: on ${name(snap.hook)}.`
            : `The hook goes on what comes after this group: ${name(snap.hook)}.`,
          7,
          snap,
        );
        break;
      case "hand":
        push(`The hand takes the group's first car, ${name(car)}.`, 8, snap);
        break;
      case "flag":
        if (detailed) push(`Flag first, so that nothing gets lost: plant it on ${name(snap.flag)}.`, 10, snap);
        break;
      case "swing":
        if (detailed) push(step.first ? `The coupling of ${name(car)} swings to the hook. It reaches over the group to ${name(snap.links[car])}.` : `The coupling of ${name(car)} swings round to the hook, ${name(snap.links[car])}.`, 11, snap);
        break;
      case "hookMove":
        if (detailed) push(`The hook moves up to ${name(car)}.`, 12, snap);
        break;
      case "handMove":
        if (detailed) push(step.last ? `The hand moves to the flag, ${name(snap.hand)}. That is past the group, so this group is turned.` : `The hand moves to the flag, ${name(snap.hand)}.`, 13, snap);
        else
          frames.push({
            scene,
            caption: step.first
              ? `The same steps for ${name(car)}: flag ahead, then its coupling reaches over to the hook, ${name(snap.links[car])}. Hook and hand step on.`
              : `The same steps for ${name(car)}: flag ahead, coupling round to the hook, ${name(snap.links[car])}. Hook and hand step on.`,
            codeLine: 11,
            state: { ...toState(run, snap), freshLink: car },
          });
        break;
      case "stitch": {
        if (!askedStitch) ask(stitchQuiz(run, before(step), k, car, snap.scout ?? 0));
        askedStitch = true;
        push(`The anchor lets go of ${name(car)} and hooks onto the scout's car, ${name(snap.scout)}. The group is stitched back into the train.`, 16, snap);
        break;
      }
      case "straight":
        push("Pull the train straight. No coupling changes: it is the same train, drawn in order.", 16, snap);
        break;
      case "anchorMove":
        push(`The anchor moves to ${name(car)}, the car just before the next group.`, 17, snap);
        break;
      case "done":
        if (run.answer !== solve(task)) throw new Error("reverse-nodes-in-k-group: the pictured couplings disagree with the solver");
        push(`Follow the couplings from the spare engine, car by car. The answer is ${run.answer}.`, 19, snap);
        frames.push({
          scene,
          caption: `Time: O(n). The scout passes each car once and the hand turns each car at most once: ${snap.visits} visits for ${plural(task.values.length, "car")}. The slow way walked past ${walked}.`,
          codeLine: 4,
          state: { ...toState(run, snap), counter: { label: "car visits", value: snap.visits } },
        });
        frames.push({
          scene,
          caption: "Space: O(1). Only a spare engine and five markers are used, however long the train is. No second train is built.",
          codeLine: 0,
          state: toState(run, [...run.steps].reverse().find((item) => item.kind === "short")?.snap ?? snap),
        });
        break;
    }
  }
  return frames;
}

/** The reader places the scout, swings every coupling and stitches the group in. The hook is hidden. */
function practiceFrames(): TrainFrame[] {
  const scene: SceneId = "card";
  const task = parseTask(PRACTICE);
  const run = simulate(task);
  const { k } = task;
  const frames: TrainFrame[] = [];
  const shown: ("hand" | "flag" | "scout" | "anchor")[] = ["hand", "flag", "scout", "anchor"];
  const name = (cell: number | null) => (cell === null || cell === run.end ? "null" : cell === 0 ? "the spare engine" : `the car ${run.cells[cell].label}`);
  const push = (caption: string, snap: Snap, quiz?: StoryQuiz) => frames.push({ scene, caption, state: toState(run, snap, shown), ...(quiz ? { quiz } : {}) });
  const before = (step: Step) => run.steps[run.steps.indexOf(step) - 1].snap;

  for (const step of run.steps) {
    const { snap, car } = step;
    switch (step.kind) {
      case "engine":
        push(`Your turn, on a new train: ${task.values.join(", ")}, in groups of ${k}. You place the scout and hook every coupling. The hook marker is hidden.`, snap);
        break;
      case "anchor":
        push("The anchor starts on the spare engine.", snap);
        break;
      case "scout":
        frames[frames.length - 1].quiz = scoutQuiz(run, before(step), k, snap.scout ?? 0);
        break;
      case "hand":
        push(`The scout stops on ${name(snap.scout)}: a full group. The hand takes the group's first car, ${name(car)}.`, snap);
        break;
      case "flag":
        if (!step.first) push(`The coupling of ${name(before(step).hook)} now points at ${name(snap.links[before(step).hook ?? 0])}. The hand steps on to ${name(car)}.`, { ...snap, fresh: before(step).hook });
        break;
      case "swing":
        frames[frames.length - 1].quiz = swingQuiz(run, { ...step, snap: before(step) });
        break;
      case "stitch":
        push(`The coupling of ${name(before(step).hook)} now points at ${name(before(step).links[before(step).hook ?? 0])}. The hand is past the group.`, { ...before(step), fresh: before(step).hook }, stitchQuiz(run, before(step), k, car, snap.scout ?? 0));
        push(`The anchor now hooks onto ${name(snap.scout)}, the group's new first car. The train is whole again.`, snap);
        break;
      case "anchorMove":
        push(`The train is pulled straight, and the anchor moves to ${name(car)}, just before the next group.`, snap);
        break;
      case "short":
        frames[frames.length - 1].quiz = scoutQuiz(run, before(step), k, run.end);
        if (step.counted === 0) push("The scout finds null right away. No cars are left.", snap);
        break;
      case "trap":
        push(`The scout ran out of train after ${plural(step.counted, "car")}. Turning such a short group is the Leftover Reversal Trap. It stays as it is.`, snap);
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

export const reverseNodesInKGroupStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-25"],
  pattern: "Linked list: turn the links round, group by group",
  trigger: "“reverse the nodes of a linked list k at a time”, where a short last group must stay as it is",
  insight: "A scout checks that k cars are left. Then the group is turned coupling by coupling, its old first car holds the rest of the train, and the anchor hooks onto the group's new first car.",
  metaphor: {
    name: "The train yard",
    legend: "spare engine = dummy · anchor = groupPrev · scout = kth · hook = prev · hand = curr · flag = next",
    terms: ["car", "coupling", "train", "scout", "anchor", "hook", "hand", "flag", "engine"],
  },
  traps: [{ name: "The Leftover Reversal Trap", rule: "Count k cars ahead before touching a group. If the scout reaches null first, the last cars stay exactly as they are." }],
  template: [
    "dummy before head; groupPrev = dummy;",
    "loop {",
    "    kth = k steps after groupPrev; if there is none, stop;   // leftovers stay",
    "    turn the links from groupPrev.next to kth, starting with prev = kth.next;",
    "    hook groupPrev onto kth; groupPrev = the group's old first node;",
    "}",
    "answer starts after dummy;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the scout passes each car once, and the hand turns each car at most once",
    space: "O(1)",
    spaceWhy: "one spare engine and a handful of markers, however long the train is",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5], k = 2", input: "head=[1,2,3,4,5], k=2", expected: "2->1->4->3->5" },
    { label: "[1,2,3,4,5], k = 3", input: "head=[1,2,3,4,5], k=3", expected: "3->2->1->4->5", note: "Two cars are left over" },
    { label: "[1,2,3,4], k = 2", input: "head=[1,2,3,4], k=2", expected: "2->1->4->3", note: "No leftover" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-206", title: "Reverse Linked List" },
    { slug: "lc-143", title: "Reorder List" },
    { slug: "lc-19", title: "Remove Nth Node From End of List" },
  ],
  answer: (input) => solve(parseTask(input)),
  frames: (input) => {
    const task = parseTask(input);
    const run = simulate(task);
    const slow = slowWalk(task);
    const full = Math.floor(task.values.length / task.k) * task.k;
    return [
      ...pictureFrames(task),
      ...slow.frames,
      ...insightFrames(task, run),
      ...solutionFrames(task, run, slow.walked),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: plainTrain(task.values, finalOrder(task), (index) => (index < full ? "done" : null)),
      },
    ];
  },
  View: LinkedListReverseView,
};
