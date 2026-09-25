import type { CellTone } from "@/components/learn/viz/primitives";

import { RotateListView, type RotateListState, type RotatePointer } from "../rotate-list-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<RotateListState>;

/** Fresh necklace for the "your turn" run. k is larger than the list, so it reaches the trap. */
const PRACTICE = "[3,7,9,4]\n6";

const CODE = [
  "if (head == null || head.next == null) return head;",
  "int length = 1;",
  "ListNode tail = head;",
  "while (tail.next != null) {",
  "    tail = tail.next;",
  "    length++;",
  "}",
  "k %= length;",
  "if (k == 0) return head;",
  "ListNode newTail = head;",
  "for (int i = 1; i < length - k; i++) newTail = newTail.next;",
  "ListNode newHead = newTail.next;",
  "newTail.next = null;",
  "tail.next = head;",
  "return newHead;",
];

/** "[1,2,3,4,5]\n2": the list on the first line, k on the second. */
function parse(raw: string): { values: number[]; k: number } {
  const lines = raw.trim().split(/\n+/);
  const values = (lines[0]?.match(/-?\d+/g) ?? []).map(Number);
  const k = Math.max(0, Number((lines[1]?.match(/\d+/) ?? ["0"])[0]));
  return { values, k };
}

function show(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** Independent solver: real nodes, and the last node really moved to the front, k % n times. */
type ListNode = { value: number; next: ListNode | null };

function solve(values: number[], k: number): string {
  if (values.length === 0) return "[]";
  let head: ListNode | null = null;
  for (let index = values.length - 1; index >= 0; index--) head = { value: values[index], next: head };
  const moves = k % values.length;
  for (let move = 0; move < moves; move++) {
    let beforeLast = head!;
    while (beforeLast.next !== null && beforeLast.next.next !== null) beforeLast = beforeLast.next;
    const last = beforeLast.next;
    if (last === null) break;
    beforeLast.next = null;
    last.next = head;
    head = last;
  }
  const out: number[] = [];
  for (let node = head; node !== null; node = node.next) out.push(node.value);
  return show(out);
}

const TAIL = (at: number): RotatePointer => ({ name: "tail", at, tone: "ink" });
const NEW_TAIL = (at: number): RotatePointer => ({ name: "new tail", at, tone: "accent" });
const NEW_HEAD = (at: number): RotatePointer => ({ name: "new head", at, tone: "teal" });

/** The beads in their given order, each string reaching the next bead, the last reaching nothing. */
function base(values: number[], paint: (cell: number) => CellTone | null = () => null): RotateListState {
  const count = values.length;
  return {
    values,
    slots: values.map((_, cell) => cell),
    links: values.map((_, cell) => (cell + 1 < count ? cell + 1 : null)),
    tones: values.map((_, cell) => paint(cell) ?? "idle"),
    pointers: [],
  };
}

/** The picture of a real order of beads: slots and strings both follow that order. */
function inOrder(values: number[], order: number[], paint: (cell: number) => CellTone | null = () => null): RotateListState {
  const slots = values.map(() => 0);
  const links: (number | null)[] = values.map(() => null);
  order.forEach((cell, slot) => {
    slots[cell] = slot;
    links[cell] = slot + 1 < order.length ? order[slot + 1] : null;
  });
  return { ...base(values, paint), slots, links };
}

/** One rotation, really done: the last bead comes off the end and goes to the front. */
function rotateOnce(order: number[]): number[] {
  const next = [...order];
  const last = next.pop();
  if (last !== undefined) next.unshift(last);
  return next;
}

/** Follow the strings the picture ended with, so the stated answer is read off the drawing itself. */
function readBeads(values: number[], links: (number | null)[], from: number): string {
  const out: number[] = [];
  for (let cell: number | null = from; cell !== null && out.length <= values.length; cell = links[cell]) out.push(values[cell]);
  return show(out);
}

function pictureFrames(values: number[], k: number): Frame[] {
  const count = values.length;
  const last = count - 1;
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `This is a list of ${count} beads on a string: ${values.join(", ")}. Each bead's string leads to the next bead. The last bead, ${values[last]}, leads to nothing: the end.`,
      state: base(values),
    },
  ];
  if (count >= 2) {
    const once = rotateOnce(values.map((_, cell) => cell));
    frames.push({
      scene: "picture",
      caption: `One rotation: the last bead, ${values[last]}, comes off the end and goes to the front. The list becomes ${once.map((cell) => values[cell]).join(", ")}.`,
      state: { ...inOrder(values, once, (cell) => (cell === last ? "edge" : null)), freshLink: last, note: "after 1 rotation" },
    });
  }
  if (count >= 3) {
    frames.push({
      scene: "picture",
      caption: `The string runs one way only. From the bead ${values[1]} you can reach the bead ${values[2]}, but you can never go back to the bead ${values[0]}.`,
      state: base(values, (cell) => (cell === 1 ? "edge" : cell === 2 ? "done" : cell === 0 ? "miss" : null)),
    });
  }
  let order = values.map((_, cell) => cell);
  for (let move = 0; move < k % Math.max(count, 1); move++) order = rotateOnce(order);
  frames.push({
    scene: "picture",
    caption: k === 0 ? `The goal: rotate k = 0 times. Nothing moves, so the list stays ${show(values)}.` : `The goal: do that k = ${k} times in all. The list becomes ${show(order.map((cell) => values[cell]))}.`,
    state: { ...inOrder(values, order, () => "done"), note: `after ${k} rotation${k === 1 ? "" : "s"}` },
  });
  return frames;
}

/** The obvious way, really run: k rotations, and each one walks the whole list to find the bead before the last. */
function slowFrames(values: number[], k: number): { frames: Frame[]; visited: number } {
  const count = values.length;
  const frames: Frame[] = [];
  let order = values.map((_, cell) => cell);
  let visited = 0;
  if (count < 2 || k === 0) {
    frames.push({
      scene: "slow",
      caption: count < 2 ? "The slow way: with one bead there is nothing to walk. Rotating changes nothing." : "The slow way: k = 0 means no rotations at all. Nothing is walked.",
      state: { ...base(values), counter: { label: "beads visited", value: 0 } },
    });
    return { frames, visited };
  }
  for (let move = 1; move <= k; move++) {
    const beforeLast = order[count - 2];
    const last = order[count - 1];
    visited += count - 1;
    if (move <= 3) {
      frames.push({
        scene: "slow",
        caption:
          move === 1
            ? `The slow way: do exactly what the statement says. Walk from the front to the bead before the last one, the bead ${values[beforeLast]}.`
            : `Rotation ${move}: walk from the front again, all the way to the bead ${values[beforeLast]}.`,
        state: { ...inOrder(values, order, (cell) => (cell === beforeLast ? "edge" : cell === last ? null : "window")), counter: { label: "beads visited", value: visited }, note: `rotations done: ${move - 1}` },
      });
    }
    order = rotateOnce(order);
    if (move <= 3) {
      frames.push({
        scene: "slow",
        caption: `Move the last bead, ${values[last]}, to the front. That is rotation ${move} of ${k}.`,
        state: { ...inOrder(values, order, (cell) => (cell === last ? "edge" : null)), freshLink: last, counter: { label: "beads visited", value: visited }, note: `rotations done: ${move}` },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `${k} rotations, ${visited} beads visited, for a list of only ${count}. Every rotation walks the whole list: O(n·k) time. k can be two billion, so this never ends.`,
    state: { ...inOrder(values, order, () => "faded"), counter: { label: "beads visited", value: visited }, note: `rotations done: ${k}` },
  });
  return { frames, visited };
}

function insightFrames(values: number[], k: number): Frame[] {
  const count = values.length;
  if (count < 2) return [];
  const last = count - 1;
  const remainder = k % count;
  const newTail = count - remainder - 1;
  const ring = (paint: (cell: number) => CellTone | null = () => null): RotateListState => {
    const state = base(values, paint);
    state.links[last] = 0;
    return state;
  };
  const moving = values.slice(count - remainder);
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: `Picture the beads as a necklace: tie the last bead, ${values[last]}, to the first bead, ${values[0]}. Now the string has no end. It just goes round.`,
      state: { ...ring(), freshLink: last },
    },
    {
      scene: "insight",
      caption:
        k >= count
          ? `Turn a necklace ${count} times, once per bead, and every bead is back where it started. So ${k} rotations count as only ${remainder}.`
          : `Turn a necklace ${count} times, once per bead, and every bead is back where it started. Here k = ${k} is less than ${count}, so all ${k} count.`,
      state: { ...ring(), turns: { k, n: count, remainder } },
    },
    {
      scene: "insight",
      caption:
        remainder === 0
          ? `Nothing needs to move. The cut stays where the string was already open: after the last bead, ${values[last]}.`
          : `The last ${remainder} bead${remainder === 1 ? "" : "s"}, ${moving.join(", ")}, must come to the front. On a necklace that only means one thing: cut the string after the bead ${values[newTail]}.`,
      state: { ...ring((cell) => (cell > newTail ? "window" : null)), cut: newTail },
    },
  ];
  const cutRing = ring(() => "done");
  cutRing.links[newTail] = null;
  frames.push({
    scene: "insight",
    caption: `Cut there, and read the necklace from the bead ${values[(newTail + 1) % count]}: ${readBeads(values, cutRing.links, (newTail + 1) % count)}. No rotating at all: one tie and one cut.`,
    state: { ...cutRing, cut: newTail },
  });
  return frames;
}

function remainderQuiz(k: number, count: number): StoryQuiz {
  const remainder = k % count;
  const options: string[] = [];
  for (const candidate of [k, remainder, count, count - remainder, 0, k + 1]) {
    const text = String(candidate);
    if (!options.includes(text)) options.push(text);
    if (options.length === 3) break;
  }
  return {
    kind: "choice",
    question: `k = ${k} and there are ${count} beads. How many rotations really matter?`,
    options,
    answer: options.indexOf(String(remainder)),
    why: `Every ${count} rotations is one full turn of the necklace: back to the start. Only the remainder, ${remainder}, does anything.`,
  };
}

function newTailQuiz(values: number[], remainder: number): StoryQuiz {
  const count = values.length;
  const newTail = count - remainder - 1;
  const feedback: Record<number, string> = {};
  feedback[count - 1] = "That is the old tail. Cut after it and nothing moves at all.";
  feedback[count - remainder] = `That bead is the first of the last ${remainder}. It moves to the front, so it becomes the new head, not the new tail.`;
  return {
    kind: "cell",
    cells: count,
    question: `${remainder === 1 ? "The last bead moves" : `The last ${remainder} beads move`} to the front. Which bead is the last one that stays put, the new tail? Click it.`,
    answer: newTail,
    feedback,
    otherwise: "Count the moving beads from the far end. The new tail is the bead just before them.",
    why: `The bead ${values[newTail]} is ${count} − ${remainder} = ${newTail + 1} beads in from the front. Everything after it moves to the front.`,
  };
}

function cutQuiz(values: number[], newTail: number, newHead: number): StoryQuiz {
  return {
    kind: "choice",
    question: `The bead ${values[newTail]} is the new tail. What must its string lead to now?`,
    options: [`the bead ${values[newHead]}`, "nothing: it is the end", `the bead ${values[0]}`],
    answer: 1,
    why: "A tail leads to nothing. Cutting here is what turns the ring back into a list.",
  };
}

function tieQuiz(values: number[], newTail: number, newHead: number): StoryQuiz {
  const count = values.length;
  return {
    kind: "cell",
    cells: count,
    question: `The old tail, the bead ${values[count - 1]}, still leads to nothing. Which bead must it be tied to? Click it.`,
    answer: 0,
    feedback: {
      [newHead]: "That is the new head. Nothing should lead to it. The old tail ties on to the old front.",
      [newTail]: "That is the new tail, the end. The old tail must close the gap where the necklace used to be open.",
    },
    otherwise: "The tie closes the gap where the necklace used to be open.",
    why: `The old tail, ${values[count - 1]}, ties on to the old front, ${values[0]}. The two halves are one necklace again.`,
  };
}

/** The real algorithm, one frame per change, each on its Java line. */
function solutionFrames(values: number[], k: number, visited: number): Frame[] {
  const scene: SceneId = "solution";
  const count = values.length;
  const links: (number | null)[] = base(values).links;
  const frames: Frame[] = [];
  let tail = 0;
  let counted = 1;
  let newTail: number | null = null;
  let newHead: number | null = null;
  let fresh: number | null = null;
  let cut: number | null = null;
  let turns: RotateListState["turns"] = null;

  const shot = (paint: (cell: number) => CellTone | null = () => null): RotateListState => ({
    ...base(values, paint),
    links: [...links],
    pointers: [TAIL(tail), ...(newTail !== null ? [NEW_TAIL(newTail)] : []), ...(newHead !== null ? [NEW_HEAD(newHead)] : [])],
    freshLink: fresh,
    cut,
    turns,
    counter: { label: "beads counted", value: counted },
  });

  frames.push({ scene, caption: `A finger called tail starts on the first bead, ${values[0]}. Beads counted so far: 1.`, codeLine: 2, state: shot((cell) => (cell === tail ? "edge" : null)) });
  while (links[tail] !== null) {
    tail = links[tail]!;
    counted++;
    frames.push({ scene, caption: `tail steps along the string to the bead ${values[tail]}. Beads counted: ${counted}.`, codeLine: 4, state: shot((cell) => (cell === tail ? "edge" : cell < tail ? "window" : null)) });
  }
  const remainder = k % count;
  frames.push({
    scene,
    caption: `Nothing after the bead ${values[tail]}: tail has found the far end. The necklace has ${count} beads.`,
    codeLine: 3,
    state: shot((cell) => (cell === tail ? "hit" : null)),
    quiz: count >= 2 ? remainderQuiz(k, count) : undefined,
  });

  turns = { k, n: count, remainder };
  frames.push({
    scene,
    caption:
      k >= count
        ? `Rotating k times when k is huge is the trap. Every ${count} rotations is one full turn of the necklace, back to the start. Only the remainder, ${remainder}, matters.`
        : `Rotating k times when k is huge is the trap to avoid. Here k = ${k} is smaller than ${count} beads, so the remainder is still ${k}: nothing is wasted.`,
    codeLine: 7,
    state: shot(),
  });

  // The closing frames keep the layout the answer was read in, so nothing jumps.
  const finish = (answer: string, steps: number, layout: Pick<RotateListState, "slots" | "links">) => {
    frames.push({
      scene,
      caption: `Time: O(n). tail walked the ${count} bead${count === 1 ? "" : "s"} once, and new tail walked ${steps} more. No rotating at all: the slow way visited ${visited} beads.`,
      codeLine: 3,
      state: { ...shot(() => "done"), ...layout, counter: { label: "beads visited", value: count + steps } },
    });
    frames.push({
      scene,
      caption: `Space: O(1). Three fingers, tail, new tail and new head, however long the necklace is. The beads were re-tied, never copied, and the answer is ${answer}.`,
      codeLine: 9,
      state: { ...shot(() => "done"), ...layout },
    });
  };

  if (remainder === 0) {
    const answer = readBeads(values, links, 0);
    frames.push({ scene, caption: `The remainder is 0, so nothing moves. The necklace stays as it is. The answer is ${answer}.`, codeLine: 8, state: shot(() => "done") });
    finish(answer, 0, { slots: base(values).slots, links: [...links] });
    return frames;
  }

  const target = count - remainder - 1;
  const steps = target;
  newTail = 0;
  const moving = (cell: number): CellTone | null => (cell > target ? "window" : null);
  frames.push({
    scene,
    caption: `${remainder === 1 ? "The last bead moves" : `The last ${remainder} beads move`} to the front. A second finger, new tail, starts on the first bead, ${values[0]}. It must find the last bead that stays put.`,
    codeLine: 9,
    state: shot(moving),
    quiz: newTailQuiz(values, remainder),
  });
  frames.push({
    scene,
    caption:
      steps === 0
        ? `The new tail is the first bead, ${values[target]}, already under the finger: ${count} − ${remainder} = 1 bead in. No steps needed.`
        : `The new tail is the bead ${values[target]}: ${count} − ${remainder} = ${target + 1} beads in from the front. That is ${steps} step${steps === 1 ? "" : "s"} along the string.`,
    codeLine: 10,
    state: shot((cell) => (cell === target ? "hit" : moving(cell))),
  });
  for (let step = 1; step <= steps; step++) {
    newTail = links[newTail]!;
    frames.push({
      scene,
      caption: step < steps ? `Step ${step} of ${steps}: new tail moves to the bead ${values[newTail]}.` : `Step ${step} of ${steps}: new tail reaches the bead ${values[newTail]}. This is the new tail.`,
      codeLine: 10,
      state: shot((cell) => (cell === target ? "hit" : moving(cell))),
    });
  }

  newHead = links[newTail]!;
  frames.push({ scene, caption: `The bead after new tail, ${values[newHead]}, will be the new front: new head.`, codeLine: 11, state: shot((cell) => (cell === newTail ? "hit" : moving(cell))) });

  links[newTail] = null;
  cut = newTail;
  frames.push({ scene, caption: `Cut the string after the bead ${values[newTail]}. It now leads to nothing: it is the end of the necklace.`, codeLine: 12, state: shot((cell) => (cell === newTail ? "hit" : moving(cell))) });

  links[tail] = 0;
  fresh = tail;
  frames.push({ scene, caption: `Tie the old tail, the bead ${values[tail]}, to the old front, the bead ${values[0]}. The necklace is closed where it used to be open.`, codeLine: 13, state: shot((cell) => (cell === newTail ? "hit" : moving(cell))) });

  const answer = readBeads(values, links, newHead);
  if (answer !== solve(values, k)) throw new Error("rotate-list: the pictured strings disagree with the solver");
  fresh = null;
  cut = null;
  const order: number[] = [];
  for (let cell: number | null = newHead; cell !== null && order.length < count; cell = links[cell]) order.push(cell);
  const straight = inOrder(values, order, () => "done");
  frames.push({
    scene,
    caption: `Pull it straight and read from new head, the bead ${values[newHead]}: ${order.map((cell) => values[cell]).join(", ")}. The answer is ${answer}.`,
    codeLine: 14,
    state: { ...shot(() => "done"), slots: straight.slots, links: straight.links },
  });
  finish(answer, steps, { slots: straight.slots, links: straight.links });
  return frames;
}

/** The reader decides everything: the remainder, the new tail, the cut and the tie. */
function practiceFrames(): Frame[] {
  const scene: SceneId = "card";
  const { values, k } = parse(PRACTICE);
  const count = values.length;
  const last = count - 1;
  const remainder = k % count;
  const newTail = count - remainder - 1;
  const newHead = newTail + 1;
  const links: (number | null)[] = base(values).links;
  const frames: Frame[] = [];
  const moving = (cell: number): CellTone | null => (cell > newTail ? "window" : null);
  const counter = { label: "beads counted", value: count };

  frames.push({ scene, caption: `Your turn, on a new necklace: ${values.join(", ")}, with k = ${k}. The fingers move only where you say.`, state: base(values) });
  frames.push({
    scene,
    caption: `The tail finger walks to the far end and counts on the way. The last bead is ${values[last]}, and there are ${count} beads.`,
    state: { ...base(values, (cell) => (cell === last ? "hit" : null)), pointers: [TAIL(last)], counter },
    quiz: remainderQuiz(k, count),
  });
  frames.push({
    scene,
    caption: `Rotating k times when k is huge: ${k} rotations is ${Math.floor(k / count)} full turn${Math.floor(k / count) === 1 ? "" : "s"} of ${count} plus ${remainder}. Only ${remainder} matter.`,
    state: { ...base(values, (cell) => (cell === last ? "hit" : null)), pointers: [TAIL(last)], counter, turns: { k, n: count, remainder } },
  });
  frames.push({
    scene,
    caption: `The last ${remainder} beads, ${values.slice(newHead).join(", ")}, move to the front. New tail starts on the first bead, ${values[0]}.`,
    state: { ...base(values, moving), pointers: [TAIL(last), NEW_TAIL(0)], counter },
    quiz: newTailQuiz(values, remainder),
  });
  frames.push({
    scene,
    caption: `The new tail is the bead ${values[newTail]}: ${count} − ${remainder} = ${newTail + 1} beads in. The bead after it, ${values[newHead]}, is the new head.`,
    state: { ...base(values, (cell) => (cell === newTail ? "hit" : moving(cell))), pointers: [TAIL(last), NEW_TAIL(newTail), NEW_HEAD(newHead)], counter },
    quiz: cutQuiz(values, newTail, newHead),
  });
  links[newTail] = null;
  frames.push({
    scene,
    caption: `Cut. The bead ${values[newTail]} leads to nothing now: it is the end of the necklace.`,
    state: { ...base(values, (cell) => (cell === newTail ? "hit" : moving(cell))), links: [...links], cut: newTail, pointers: [TAIL(last), NEW_TAIL(newTail), NEW_HEAD(newHead)], counter },
    quiz: tieQuiz(values, newTail, newHead),
  });
  links[last] = 0;
  frames.push({
    scene,
    caption: `Tied: the bead ${values[last]} now leads to the bead ${values[0]}. Two halves, one necklace.`,
    state: { ...base(values, (cell) => (cell === newTail ? "hit" : moving(cell))), links: [...links], cut: newTail, freshLink: last, pointers: [TAIL(last), NEW_TAIL(newTail), NEW_HEAD(newHead)], counter },
  });
  const answer = readBeads(values, links, newHead);
  if (answer !== solve(values, k)) throw new Error("rotate-list: the practice strings disagree with the solver");
  const order: number[] = [];
  for (let cell: number | null = newHead; cell !== null && order.length < count; cell = links[cell]) order.push(cell);
  frames.push({
    scene,
    caption: `Read from the new head, the bead ${values[newHead]}: ${order.map((cell) => values[cell]).join(", ")}. Done, and you never rotated once.`,
    state: { ...inOrder(values, order, () => "done"), pointers: [TAIL(last), NEW_TAIL(newTail), NEW_HEAD(newHead)] },
  });
  return frames;
}

export const rotateListStory: ProblemStory<RotateListState> = {
  slugs: ["lc-61"],
  pattern: "Linked list ring and cut",
  trigger: "“rotate a linked list right by k places”, where k can be far larger than the list",
  insight: "Only k % n rotations matter. Tie the tail to the head to make a ring, then cut the string after the bead n − k in from the front.",
  metaphor: {
    name: "The necklace",
    legend: "bead = a node · string = a node's next link · fingers = tail, newTail, newHead · cut = newTail.next = null · tie = tail.next = head",
    terms: ["bead", "necklace", "string", "cut", "finger"],
  },
  traps: [{ name: "Rotating k times when k is huge", rule: "Rotating by the length n gives back the same list. Reduce k with k % n first, before any walking or moving." }],
  template: [
    "walk to the tail, counting n;",
    "k = k % n;  if (k == 0) return head;",
    "newTail = the node n - k in from the front;",
    "newHead = newTail.next;",
    "newTail.next = null;  tail.next = head;   // cut, then tie",
    "return newHead;",
  ],
  complexity: {
    slow: "O(n·k)",
    time: "O(n)",
    timeWhy: "one walk to the tail to count, then at most one more walk to the cut",
    space: "O(1)",
    spaceWhy: "three fingers: tail, newTail and newHead; the beads are re-tied, never copied",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4,5], k = 2", input: "[1,2,3,4,5]\n2", expected: "[4,5,1,2,3]" },
    { label: "[0,1,2], k = 4", input: "[0,1,2]\n4", expected: "[2,0,1]", note: "Tricky: k is larger than the list" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-189", title: "Rotate Array" },
    { slug: "lc-19", title: "Remove Nth Node From End of List" },
    { slug: "lc-25", title: "Reverse Nodes in k-Group" },
  ],
  answer: (input) => {
    const { values, k } = parse(input);
    return solve(values, k);
  },
  frames: (input) => {
    const parsed = parse(input);
    const values = parsed.values.length ? parsed.values : [1, 2, 3];
    const { k } = parsed;
    const count = values.length;
    const remainder = k % count;
    const newTail = count - remainder - 1;
    const slow = slowFrames(values, k);
    const remember = base(values, (cell) => (cell > newTail ? "done" : null));
    if (count >= 2) remember.links[count - 1] = 0;
    return [
      ...pictureFrames(values, k),
      ...slow.frames,
      ...insightFrames(values, k),
      ...solutionFrames(values, k, slow.visited),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...remember, cut: newTail, turns: { k, n: count, remainder } },
      },
    ];
  },
  View: RotateListView,
};
