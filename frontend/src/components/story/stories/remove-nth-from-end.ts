import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh train: n equals the length, so the first car must drop, and the engine is what makes that work. */
const PRACTICE = "[7,8] n=2";

const CODE = [
  "ListNode dummy = new ListNode(0, head);",
  "ListNode lead = dummy;",
  "ListNode trail = dummy;",
  "for (int i = 0; i < n; i++) lead = lead.next;",
  "while (lead.next != null) {",
  "    lead = lead.next;",
  "    trail = trail.next;",
  "}",
  "trail.next = trail.next.next;",
  "return dummy.next;",
];

function parseTask(input: string): { values: number[]; n: number } {
  const values = (input.match(/\[([^\]]*)\]/)?.[1] ?? "")
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const n = Number(input.match(/n\s*=\s*(-?\d+)/)?.[1] ?? "1");
  return { values, n: Number.isInteger(n) && n >= 1 ? n : 1 };
}

type ListNode = { value: number; next: ListNode | null };

function solve(values: number[], n: number): string {
  const dummy: ListNode = { value: 0, next: null };
  let tail = dummy;
  for (const value of values) {
    tail.next = { value, next: null };
    tail = tail.next;
  }
  let lead: ListNode | null = dummy;
  let trail: ListNode | null = dummy;
  for (let i = 0; i < n; i++) lead = lead?.next ?? null;
  while (lead?.next) {
    lead = lead.next;
    trail = trail?.next ?? null;
  }
  if (trail?.next) trail.next = trail.next.next;
  const out: number[] = [];
  for (let node = dummy.next; node !== null; node = node.next) out.push(node.value);
  return out.join("->");
}

type Yard = { cells: TrainCell[]; engine: number; end: number; values: number[] };

function yard(values: number[]): Yard {
  const cells: TrainCell[] = [{ label: "engine", kind: "engine" }, ...values.map((value) => ({ label: String(value), kind: "car" as const })), { label: "null", kind: "null" }];
  return { cells, engine: 0, end: cells.length - 1, values };
}

function forward(place: Yard): (number | null)[] {
  return place.cells.map((_, index) => (index === place.end ? null : index + 1));
}

function shot(place: Yard, links: (number | null)[], paint: (cell: number) => CellTone | null, pointers: TrainPointer[] = [], extra: Partial<LinkedListReverseState> = {}): LinkedListReverseState {
  return { cells: place.cells, slots: place.cells.map((_, index) => index), links: [...links], tones: place.cells.map((_, cell) => paint(cell) ?? "idle"), pointers, ...extra };
}

function nameOf(place: Yard, cell: number): string {
  if (cell === place.engine) return "the spare engine";
  if (cell === place.end) return "null";
  return `the car ${place.cells[cell].label}`;
}

function pictureFrames(values: number[], n: number): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const drop = values.length - n;
  const dropCell = drop >= 0 ? 1 + drop : place.end;
  return [
    {
      scene: "picture",
      caption: `This train has ${values.length} car${values.length === 1 ? "" : "s"}. Couplings only lead forward, so you cannot walk backwards from the end.`,
      state: shot(place, links, () => null),
    },
    {
      scene: "picture",
      caption: `Drop the car ${n} from the end. Here that is ${nameOf(place, dropCell)}. The cars around it must be recoupled.`,
      state: shot(place, links, (cell) => (cell === dropCell ? "miss" : null)),
    },
    {
      scene: "picture",
      caption: `The goal: the train ${solve(values, n) || "empty"} after that car is gone.`,
      state: shot(place, links, (cell) => (cell === dropCell ? "faded" : place.cells[cell].kind === "car" ? "done" : null)),
    },
  ];
}

function slowFrames(values: number[], n: number): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  let walked = 0;
  let dropAt = 0;
  values.forEach((_, index) => {
    let rest = 0;
    for (let at = index; at < values.length; at++) {
      rest++;
      walked++;
    }
    if (rest === n) dropAt = index;
    if (index > 1) return;
    frames.push({
      scene: "slow",
      caption:
        index === 0
          ? `The slow way: for each car, walk from there to the end and count how many cars remain. At the first car, ${values.length} remain.`
          : `At the next car, walk to the end again. The same tail cars are counted over and over.`,
      state: { ...shot(place, links, (cell) => (cell === 1 + index ? "edge" : cell > 1 + index && cell < place.end ? "window" : null)), counter: { label: "cars counted", value: walked } },
    });
  });
  frames.push({
    scene: "slow",
    caption: `That was ${walked} cars counted to find that ${nameOf(place, 1 + dropAt)} is ${n} from the end. This is O(n²) time.`,
    state: { ...shot(place, links, (cell) => (cell === 1 + dropAt ? "miss" : "faded")), counter: { label: "cars counted", value: walked } },
  });
  return frames;
}

function insightFrames(values: number[], n: number): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const drop = 1 + (values.length - n);
  const dropsHead = n === values.length;
  return [
    {
      scene: "insight",
      caption: `Picture a spare engine, a lead, and a trail. The lead walks ${n} car${n === 1 ? "" : "s"} ahead, then both walk together.`,
      state: shot(place, links, () => null, [
        { name: "lead", at: Math.min(n, place.end), tone: "accent" },
        { name: "trail", at: place.engine, tone: "ink" },
      ]),
    },
    {
      scene: "insight",
      caption: dropsHead
        ? `The Missing Engine Trap: if the trail starts on the first car, there is no car before it when the first car is the one to drop.`
        : `When the lead sits on the last car, the trail sits just before the car to drop. The trail then skips that car.`,
      state: {
        ...shot(place, links, (cell) => (cell === drop ? "miss" : null), [
          { name: "lead", at: values.length, tone: "accent" },
          { name: "trail", at: dropsHead ? 1 : drop - 1, tone: "ink" },
        ]),
        lost: dropsHead ? [1] : null,
      },
    },
    {
      scene: "insight",
      caption: "Start both on the spare engine. Then dropping the first car is the same skip as dropping any other car.",
      state: shot(place, links, (cell) => (cell === place.engine ? "done" : null), [
        { name: "lead", at: place.engine, tone: "accent" },
        { name: "trail", at: place.engine, tone: "ink" },
      ]),
    },
  ];
}

function leadQuiz(place: Yard, answer: number, n: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [place.engine]: "The lead starts on the engine and must leave it.",
    [place.end]: "Too far. Count only the cars, not past the train.",
  };
  place.cells.forEach((item, cell) => {
    if (cell === answer || cell === place.engine || cell === place.end) return;
    if (item.kind !== "car") return;
    feedback[cell] = cell < answer ? "Not far enough. The lead takes every step of the gap." : "Too far. The lead takes exactly that many steps, then waits.";
  });
  return {
    kind: "cell",
    cells: place.cells.length,
    question: `The lead must walk ${n} car${n === 1 ? "" : "s"} ahead of the engine. Where does it stop? Click that box.`,
    answer,
    feedback,
    otherwise: "Start on the spare engine and count that many cars forward.",
    why: `After ${n} step${n === 1 ? "" : "s"} the lead sits on ${nameOf(place, answer)}.`,
  };
}

function skipQuiz(place: Yard, trail: number, drop: number): StoryQuiz {
  const after = drop + 1;
  const feedback: Record<number, string> = {
    [trail]: "The trail stays where it is. Its coupling is what changes.",
    [drop]: "That is the car to drop. The trail's coupling must skip past it, not land on it.",
    [place.engine]: "The engine is behind the trail.",
  };
  delete feedback[after];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The lead is on the last car. The trail sits just before the car to drop. Where must the trail's coupling point? Click that box.",
    answer: after,
    feedback,
    otherwise: "Skip the car after the trail. Hook whatever sits after the dropped car.",
    why: after === place.end ? `The dropped car was last, so the trail now hooks null.` : `The trail skips ${nameOf(place, drop)} and hooks ${nameOf(place, after)}.`,
  };
}

function solutionFrames(values: number[], n: number, scene: SceneId = "solution", practice = false): Frame[] {
  const place = yard(values);
  const links = forward(place);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let lead = place.engine;
  let trail = place.engine;
  const pointers = (): TrainPointer[] => [
    { name: "lead", at: lead, tone: "accent" },
    { name: "trail", at: trail, tone: "ink" },
  ];

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new train: ${values.join(", ")}, drop ${n} from the end. You place the lead and the skip.` : "Park a spare engine in front of the train. Lead and trail both start there.",
    codeLine: line(0),
    state: shot(place, links, () => null, pointers()),
  });

  const leadTarget = n <= values.length ? n : place.end;
  frames.push({
    scene,
    caption: `The lead will walk ${n} car${n === 1 ? "" : "s"} ahead, so the gap equals the count from the end.`,
    codeLine: line(3),
    state: shot(place, links, () => null, pointers()),
    quiz: practice || values.length ? leadQuiz(place, leadTarget, n) : undefined,
  });
  for (let i = 0; i < n && lead !== place.end; i++) lead += 1;
  frames.push({
    scene,
    caption: `The lead stops on ${nameOf(place, lead)}. The trail has not moved.`,
    codeLine: line(3),
    state: shot(place, links, (cell) => (cell === lead ? "edge" : null), pointers()),
  });

  if (n === values.length && !practice) {
    frames.push({
      scene,
      caption: "The Missing Engine Trap: without the engine the trail would sit on the first car, with no coupling behind it to skip that car.",
      codeLine: line(4),
      state: { ...shot(place, links, (cell) => (cell === 1 ? "miss" : null), [{ name: "lead", at: lead, tone: "accent" }, { name: "trail", at: 1, tone: "ink" }]), lost: [1] },
    });
  }

  while (lead < values.length) {
    lead += 1;
    trail += 1;
    frames.push({
      scene,
      caption: `Both step forward. The lead is now on ${nameOf(place, lead)}. The gap stays ${n}.`,
      codeLine: line(5),
      state: shot(place, links, (cell) => (cell === lead ? "edge" : cell === trail ? "window" : null), pointers()),
    });
  }

  const drop = trail + 1;
  const after = drop + 1 <= place.end ? drop + 1 : place.end;
  frames.push({
    scene,
    caption: `The lead is on the last car. The trail sits just before the car to drop, ${nameOf(place, drop)}.`,
    codeLine: line(8),
    state: shot(place, links, (cell) => (cell === drop ? "miss" : null), pointers()),
    quiz: skipQuiz(place, trail, drop),
  });
  links[trail] = after;
  frames.push({
    scene,
    caption: `The trail skips ${nameOf(place, drop)} and hooks ${nameOf(place, after)}.`,
    codeLine: line(8),
    state: { ...shot(place, links, (cell) => (cell === drop ? "faded" : cell === trail ? "done" : null), pointers()), freshLink: trail },
  });

  const answer = solve(values, n) || "empty";
  frames.push({
    scene,
    caption: practice ? `Done. Follow the couplings from the spare engine. The answer is ${answer}.` : `Follow the couplings from the spare engine. The answer is ${answer}.`,
    codeLine: line(9),
    state: shot(place, links, (cell) => (cell === drop ? "faded" : place.cells[cell].kind === "car" ? "done" : null)),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). The lead walks the train once. The trail follows a gap of ${n}.`,
      codeLine: 4,
      state: { ...shot(place, links, (cell) => (place.cells[cell].kind === "car" && cell !== drop ? "done" : cell === drop ? "faded" : null)), counter: { label: "cars the lead passed", value: values.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only a spare engine, a lead, and a trail, however long the train is.",
      codeLine: 0,
      state: shot(place, links, (cell) => (place.cells[cell].kind === "car" && cell !== drop ? "done" : null), pointers()),
    });
  }
  return frames;
}

export const removeNthFromEndStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-19"],
  pattern: "Two pointers, n steps apart",
  trigger: "remove the n-th car from the end of a linked list, in one pass if you can",
  insight: "A spare engine, a lead n cars ahead, and a trail. When the lead sits on the last car, the trail sits just before the car to drop, even if that car is the first.",
  metaphor: { name: "Lead and trail", legend: "spare engine = dummy · lead = lead · trail = trail · n = the gap", terms: ["car", "engine", "lead", "trail", "train", "coupling"] },
  traps: [
    {
      name: "The Missing Engine Trap",
      rule: "Start lead and trail on a spare engine in front of the train. Without it, dropping the first car has no coupling behind it to skip with.",
    },
  ],
  template: [
    "dummy engine in front; lead = trail = dummy;",
    "lead walks n cars ahead;",
    "while a car is after the lead: both step once;",
    "trail skips the next car;",
    "return the car after the engine;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the lead walks the train once; the trail follows a gap of n",
    space: "O(1)",
    spaceWhy: "only a spare engine, a lead, and a trail",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3,4] n=2", input: "[1,2,3,4] n=2", expected: "1->2->4" },
    { label: "[1,2] n=2", input: "[1,2] n=2", expected: "2", note: "Drop the first car" },
    { label: "[1,2,3] n=1", input: "[1,2,3] n=1", expected: "1->2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-206", title: "Reverse Linked List" },
    { slug: "lc-21", title: "Merge Two Sorted Lists" },
    { slug: "lc-160", title: "Intersection of Two Linked Lists" },
  ],
  answer: (input) => {
    const { values, n } = parseTask(input);
    return solve(values, n);
  },
  frames: (input) => {
    const { values, n } = parseTask(input);
    const practice = parseTask(PRACTICE);
    return [...pictureFrames(values, n), ...slowFrames(values, n), ...insightFrames(values, n), ...solutionFrames(values, n), ...solutionFrames(practice.values, practice.n, "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(yard(values), forward(yard(values)), () => null) }];
  },
  View: LinkedListReverseView,
};
