import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<LinkedListReverseState>;

/** Fresh pair: train B has a car 1 that is not the join. Matching on value would stop there. */
const PRACTICE = "A=[3,1,9] B=[1,9] skipA=2 skipB=1";

const CODE = [
  "ListNode p = headA;",
  "ListNode q = headB;",
  "while (p != q) {",
  "    p = p == null ? headB : p.next;",
  "    q = q == null ? headA : q.next;",
  "}",
  "return p;",
];

type Task = { a: number[]; b: number[]; skipA: number; skipB: number };

function parseTask(input: string): Task {
  const a = (input.match(/A\s*=\s*\[([^\]]*)\]/)?.[1] ?? "")
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const b = (input.match(/B\s*=\s*\[([^\]]*)\]/)?.[1] ?? "")
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const skipA = Number(input.match(/skipA\s*=\s*(-?\d+)/)?.[1] ?? "-1");
  const skipB = Number(input.match(/skipB\s*=\s*(-?\d+)/)?.[1] ?? "0");
  return { a, b, skipA, skipB };
}

function solve(task: Task): string {
  const uniqueA = task.skipA >= 0 ? task.skipA : task.a.length;
  const shared = task.skipA >= 0 ? task.a.slice(task.skipA) : [];
  const uniqueB = task.b.slice(0, Math.max(task.skipB, 0));
  type Node = { value: number; next: Node | null; id: string };
  const sharedNodes: Node[] = shared.map((value, index) => ({ value, next: null, id: `s${index}` }));
  sharedNodes.forEach((node, index) => {
    node.next = index + 1 < sharedNodes.length ? sharedNodes[index + 1] : null;
  });
  const aNodes: Node[] = task.a.slice(0, uniqueA).map((value, index) => ({ value, next: null, id: `a${index}` }));
  aNodes.forEach((node, index) => {
    node.next = index + 1 < aNodes.length ? aNodes[index + 1] : sharedNodes[0] ?? null;
  });
  if (!aNodes.length && sharedNodes.length) aNodes.push(sharedNodes[0]);
  const bNodes: Node[] = uniqueB.map((value, index) => ({ value, next: null, id: `b${index}` }));
  bNodes.forEach((node, index) => {
    node.next = index + 1 < bNodes.length ? bNodes[index + 1] : sharedNodes[0] ?? null;
  });
  const headA: Node | null = aNodes[0] ?? sharedNodes[0] ?? null;
  const headB: Node | null = bNodes[0] ?? sharedNodes[0] ?? null;
  let p: Node | null = headA;
  let q: Node | null = headB;
  const guard = (task.a.length + task.b.length) * 2 + 4;
  let steps = 0;
  while (p !== q && steps++ < guard) {
    p = p === null ? headB : p.next;
    q = q === null ? headA : q.next;
  }
  return p ? String(p.value) : "0";
}

type Yard = {
  cells: TrainCell[];
  end: number;
  uniqueA: number;
  shared: number;
  uniqueB: number;
  headA: number;
  headB: number;
  join: number | null;
};

function layout(task: Task): Yard {
  const uniqueA = task.skipA >= 0 ? task.skipA : task.a.length;
  const sharedVals = task.skipA >= 0 ? task.a.slice(task.skipA) : [];
  const uniqueBVals = task.b.slice(0, Math.max(task.skipB, 0));
  const cells: TrainCell[] = [
    ...task.a.slice(0, uniqueA).map((value) => ({ label: String(value), kind: "car" as const })),
    ...sharedVals.map((value) => ({ label: String(value), kind: "car" as const })),
    ...uniqueBVals.map((value) => ({ label: String(value), kind: "car" as const })),
    { label: "null", kind: "null" },
  ];
  const shared = sharedVals.length;
  const uniqueB = uniqueBVals.length;
  const end = cells.length - 1;
  const join = shared ? uniqueA : null;
  const headA = uniqueA + shared + uniqueB === 0 ? end : uniqueA > 0 || shared ? 0 : end;
  const headB = uniqueB ? uniqueA + shared : join ?? end;
  return { cells, end, uniqueA, shared, uniqueB, headA, headB, join };
}

function startLinks(place: Yard): (number | null)[] {
  const links: (number | null)[] = place.cells.map(() => null);
  const aLen = place.uniqueA + place.shared;
  for (let i = 0; i < aLen; i++) links[i] = i + 1 < aLen ? i + 1 : place.end;
  const b0 = place.uniqueA + place.shared;
  for (let i = 0; i < place.uniqueB; i++) {
    links[b0 + i] = i + 1 < place.uniqueB ? b0 + i + 1 : place.join ?? place.end;
  }
  return links;
}

function shot(place: Yard, links: (number | null)[], paint: (cell: number) => CellTone | null, pointers: TrainPointer[] = [], extra: Partial<LinkedListReverseState> = {}): LinkedListReverseState {
  return { cells: place.cells, slots: place.cells.map((_, index) => index), links: [...links], tones: place.cells.map((_, cell) => paint(cell) ?? "idle"), pointers, ...extra };
}

function nameOf(place: Yard, cell: number): string {
  if (cell === place.end) return "null";
  const label = place.cells[cell].label;
  const b0 = place.uniqueA + place.shared;
  const twins = place.cells.filter((item) => item.kind === "car" && item.label === label).length;
  if (twins < 2) return `the car ${label}`;
  if (cell < place.uniqueA) return `the car ${label} on train A`;
  if (cell < b0) return `the car ${label}`;
  return `the car ${label} on train B`;
}

function pictureFrames(task: Task): Frame[] {
  const place = layout(task);
  const links = startLinks(place);
  const join = place.join;
  return [
    {
      scene: "picture",
      caption: `Two trains: A starts at ${nameOf(place, place.headA)}, B starts at ${nameOf(place, place.headB)}. They may share a suffix of the same cars.`,
      state: shot(place, links, () => null),
    },
    {
      scene: "picture",
      caption:
        join !== null
          ? `A shared car is the same car, not two cars with the same number. Here they join at ${nameOf(place, join)}.`
          : "These two trains never share a car. They are two separate tracks that both end at null.",
      state: shot(place, links, (cell) => (join !== null && cell >= join && cell < join + place.shared ? "done" : null)),
    },
    {
      scene: "picture",
      caption: `The goal: the first shared car, or 0 if they never meet. The answer is ${solve(task)}.`,
      state: shot(place, links, (cell) => (join !== null && cell === join ? "done" : null)),
    },
  ];
}

function slowFrames(task: Task): Frame[] {
  const place = layout(task);
  const links = startLinks(place);
  const frames: Frame[] = [];
  let looks = 0;
  const aLen = place.uniqueA + place.shared;
  const b0 = aLen;
  const bCount = place.uniqueB + place.shared;
  let shown = 0;
  for (let bi = 0; bi < bCount; bi++) {
    const bCell = bi < place.uniqueB ? b0 + bi : place.uniqueA + (bi - place.uniqueB);
    for (let ai = 0; ai < aLen; ai++) {
      looks++;
      if (ai === bCell) {
        if (shown < 2) {
          frames.push({
            scene: "slow",
            caption: shown === 0 ? `The slow way: for each car of train B, walk all of train A looking for that same car.` : `The next car of train B: walk train A from the front again.`,
            state: { ...shot(place, links, (cell) => (cell === bCell ? "edge" : cell === ai ? "window" : null)), counter: { label: "cars compared", value: looks } },
          });
        }
        shown++;
        frames.push({
          scene: "slow",
          caption: `That was ${looks} compares. This is O(m n) time: every car of B may re-read all of A.`,
          state: { ...shot(place, links, (cell) => (cell === bCell ? "done" : "faded")), counter: { label: "cars compared", value: looks } },
        });
        return frames;
      }
    }
    if (shown < 2) {
      frames.push({
        scene: "slow",
        caption: shown === 0 ? `The slow way: for each car of train B, walk all of train A looking for that same car. This one is not on A.` : `The next car of train B: walk train A from the front again.`,
        state: { ...shot(place, links, (cell) => (cell === bCell ? "edge" : cell < aLen ? "window" : null)), counter: { label: "cars compared", value: looks } },
      });
      shown++;
    }
  }
  frames.push({
    scene: "slow",
    caption: `No shared car. That was ${looks} compares. This is O(m n) time: every car of B re-reads all of A.`,
    state: { ...shot(place, links, () => "faded"), counter: { label: "cars compared", value: looks } },
  });
  return frames;
}

function firstTwin(place: Yard): { a: number; b: number } | null {
  const b0 = place.uniqueA + place.shared;
  for (let b = b0; b < b0 + place.uniqueB; b++) {
    for (let a = 0; a < place.uniqueA; a++) {
      if (place.cells[a].label === place.cells[b].label) return { a, b };
    }
  }
  return null;
}

function insightFrames(task: Task): Frame[] {
  const place = layout(task);
  const links = startLinks(place);
  const twin = firstTwin(place);
  return [
    {
      scene: "insight",
      caption: "Walk both trains. When a walker hits null, switch it onto the other train's first car. Both then travel the same total length.",
      state: shot(place, links, () => null, [
        { name: "p", at: place.headA, tone: "accent" },
        { name: "q", at: place.headB, tone: "teal" },
      ]),
    },
    twin
      ? {
          scene: "insight",
          caption: `The Value Twin Trap: ${nameOf(place, twin.b)} and ${nameOf(place, twin.a)} both show ${place.cells[twin.a].label}, but they are not the same car.`,
          state: shot(place, links, (cell) => (cell === twin.a || cell === twin.b ? "miss" : place.join !== null && cell === place.join ? "window" : null), [
            { name: "q", at: twin.b, tone: "teal" },
          ]),
        }
      : {
          scene: "insight",
          caption: "The join is the same car, not two cars with the same number. Matching on the number is the Value Twin Trap.",
          state: shot(place, links, (cell) => (place.join !== null && cell === place.join ? "window" : null)),
        },
    {
      scene: "insight",
      caption: place.join !== null ? `After the switch they meet on the first shared car, ${nameOf(place, place.join)}. If there is no join, both hit null together.` : "If the trains never join, both walkers hit null on the same step, and that is the answer.",
      state: shot(place, links, (cell) => (place.join !== null && cell === place.join ? "done" : cell === place.end ? "window" : null), [
        { name: "p", at: place.join ?? place.end, tone: "accent" },
        { name: "q", at: place.join ?? place.end, tone: "teal" },
      ]),
    },
  ];
}

function switchQuiz(place: Yard, who: "p" | "q", answer: number): StoryQuiz {
  const other = who === "p" ? place.headB : place.headA;
  const feedback: Record<number, string> = {
    [place.end]: "Null is where this walker is now. The switch leaves null for the other train's first car.",
    [who === "p" ? place.headA : place.headB]: "That is this walker's own first car. The switch goes to the other train.",
  };
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: `${who} reached null. Which box does that walker switch onto? Click it.`,
    answer,
    feedback,
    otherwise: "A walker that hits null starts the other train from the front.",
    why: `${who} switches onto ${nameOf(place, other)}, the first car of the other train.`,
  };
}

function meetQuiz(place: Yard, answer: number): StoryQuiz {
  const twin = firstTwin(place);
  const feedback: Record<number, string> = {
    [place.headA]: "That is where train A began. The walkers have already left it.",
    [place.headB]: "That is where train B began.",
  };
  if (twin) {
    feedback[twin.a] = "Same number, different car. That is the Value Twin Trap.";
    feedback[twin.b] = "Same number, different car. That is the Value Twin Trap.";
  }
  delete feedback[answer];
  return {
    kind: "cell",
    cells: place.cells.length,
    question: "The two walkers take one more step. Which box do they both land on? Click it.",
    answer,
    feedback,
    otherwise: "They meet on the first shared car, or on null if the trains never join.",
    why: answer === place.end ? "The trains never share a car, so both land on null." : `They meet on ${nameOf(place, answer)}, the first shared car.`,
  };
}

function solutionFrames(task: Task, scene: SceneId = "solution", practice = false): Frame[] {
  const place = layout(task);
  const links = startLinks(place);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  let p = place.headA;
  let q = place.headB;
  const twin = firstTwin(place);
  let askedMeet = false;
  const pointers = (): TrainPointer[] => [
    { name: "p", at: p, tone: "accent" },
    { name: "q", at: q, tone: "teal" },
  ];

  frames.push({
    scene,
    caption: practice ? `Your turn, on two new trains. You watch every step, and you must not stop on a value twin.` : "p starts on train A. q starts on train B. They walk until they are the same car.",
    codeLine: line(0),
    state: shot(place, links, () => null, pointers()),
  });

  if (twin && !practice) {
    frames.push({
      scene,
      caption: `The Value Twin Trap: ${nameOf(place, twin.b)} shows ${place.cells[twin.b].label}, and train A has a car ${place.cells[twin.a].label} too. They are not the same car.`,
      codeLine: line(2),
      state: shot(place, links, (cell) => (cell === twin.a || cell === twin.b ? "miss" : null), pointers()),
    });
  }

  const guard = (place.cells.length) * 3;
  let steps = 0;
  while (p !== q && steps++ < guard) {
    const nextP = p === place.end ? place.headB : links[p] ?? place.end;
    const nextQ = q === place.end ? place.headA : links[q] ?? place.end;
    const meetNext = nextP === nextQ;
    const switching = p === place.end || q === place.end;
    const switchWho: "p" | "q" | null = p === place.end ? "p" : q === place.end ? "q" : null;
    const switchTo = switchWho === "p" ? place.headB : switchWho === "q" ? place.headA : null;
    let quiz: StoryQuiz | undefined;
    if (meetNext && (practice || !askedMeet)) quiz = meetQuiz(place, nextP);
    else if (practice && switchWho && switchTo !== null && !askedMeet) quiz = switchQuiz(place, switchWho, switchTo);
    frames.push({
      scene,
      caption: switching ? `${p === place.end ? "p" : "q"} reached null, so that walker switches onto the other train's first car.` : `p is on ${nameOf(place, p)}. q is on ${nameOf(place, q)}. Both take one step.`,
      codeLine: line(3),
      state: shot(place, links, (cell) => (cell === p || cell === q ? "window" : null), pointers()),
      quiz,
    });
    if (meetNext) askedMeet = true;
    p = nextP;
    q = nextQ;
    frames.push({
      scene,
      caption: p === q ? (p === place.end ? "Both landed on null. The trains never join." : `Both landed on ${nameOf(place, p)}. That is the same car.`) : `p is now on ${nameOf(place, p)}. q is now on ${nameOf(place, q)}.`,
      codeLine: line(3),
      state: shot(place, links, (cell) => (p === q && cell === p ? "done" : cell === p || cell === q ? "edge" : null), pointers()),
    });
  }

  const answer = solve(task);
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}.` : `The walkers stopped. The answer is ${answer}.`,
    codeLine: line(6),
    state: shot(place, links, (cell) => (p !== place.end && cell === p ? "done" : null), pointers()),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(m + n). Each walker travels at most both trains once.`,
      codeLine: 2,
      state: { ...shot(place, links, (cell) => (place.join !== null && cell === place.join ? "done" : "faded")), counter: { label: "steps walked", value: steps } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two walkers, however long the trains are.",
      codeLine: 0,
      state: shot(place, links, () => null, pointers()),
    });
  }
  return frames;
}

export const intersectionTwoListsStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-160"],
  pattern: "Two pointers on two lists",
  trigger: "the first shared car of two singly linked lists, or a report that they do not meet",
  insight: "Walk both trains. When a walker hits null, switch it onto the other train. They travel the same total length and meet at the shared car, or both hit null.",
  metaphor: { name: "Two trains, switch heads", legend: "p = walker on A then B · q = walker on B then A · null = switch", terms: ["car", "train", "walker", "switch", "coupling"] },
  traps: [
    {
      name: "The Value Twin Trap",
      rule: "The join is the same car, not two cars with the same number. Values may repeat before the join.",
    },
  ],
  template: [
    "p = first car of A; q = first car of B;",
    "while p and q are not the same car:",
    "    p steps, or switches to B when it hits null;",
    "    q steps, or switches to A when it hits null;",
    "return p;  // the shared car, or null",
  ],
  complexity: {
    slow: "O(m n)",
    time: "O(m + n)",
    timeWhy: "each walker travels at most both trains once",
    space: "O(1)",
    spaceWhy: "only the two walkers",
  },
  code: CODE,
  examples: [
    { label: "join at 8", input: "A=[4,1,8] B=[5,8] skipA=2 skipB=1", expected: "8" },
    { label: "value twins", input: "A=[2,1,8] B=[1,8] skipA=2 skipB=1", expected: "8", note: "B's car 1 is not the join" },
    { label: "no join", input: "A=[2,6] B=[1,5] skipA=-1 skipB=2", expected: "0" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-141", title: "Linked List Cycle" },
    { slug: "lc-19", title: "Remove Nth Node From End of List" },
    { slug: "lc-21", title: "Merge Two Sorted Lists" },
  ],
  answer: (input) => solve(parseTask(input)),
  frames: (input) => {
    const task = parseTask(input);
    const place = layout(task);
    return [...pictureFrames(task), ...slowFrames(task), ...insightFrames(task), ...solutionFrames(task), ...solutionFrames(parseTask(PRACTICE), "card", true), { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: shot(place, startLinks(place), () => null) }];
  },
  View: LinkedListReverseView,
};
