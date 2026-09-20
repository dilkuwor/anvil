import type { CellTone } from "@/components/learn/viz/primitives";

import { LinkedListReverseView, type LinkedListReverseState, type TrainCell, type TrainPointer } from "../linked-list-reverse-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type TrainFrame = StoryFrame<LinkedListReverseState>;

/** Fresh train for the "your turn" run. */
const PRACTICE = "8->3->5";

const CODE = [
  "ListNode prev = null;",
  "ListNode curr = head;",
  "while (curr != null) {",
  "    ListNode next = curr.next;",
  "    curr.next = prev;",
  "    prev = curr;",
  "    curr = next;",
  "}",
  "return prev;",
];

function parseTrain(input: string): number[] {
  const values = input
    .replace(/[[\]]/g, "")
    .split(/->|,/)
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
  return values.length ? values : [1, 2, 3];
}

/** Independent solver: build real nodes, turn the couplings, walk the result. */
type ListNode = { value: number; next: ListNode | null };

function solve(values: number[]): string {
  let head: ListNode | null = null;
  for (let index = values.length - 1; index >= 0; index--) head = { value: values[index], next: head };
  let prev: ListNode | null = null;
  let curr = head;
  while (curr !== null) {
    const next: ListNode | null = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  const out: number[] = [];
  for (let node = prev; node !== null; node = node.next) out.push(node.value);
  return out.join("->");
}

/**
 * The yard the pictures are drawn in. With `front`, cell 0 is the null in front of the train
 * (where the first car's coupling will swing to); the last cell is always the null at the end.
 */
type Yard = { values: number[]; cells: TrainCell[]; car: (index: number) => number; front: number | null; end: number };

function yard(values: number[], front: boolean): Yard {
  const shift = front ? 1 : 0;
  const cells: TrainCell[] = [...(front ? [{ label: "null", kind: "null" as const }] : []), ...values.map((value) => ({ label: String(value), kind: "car" as const })), { label: "null", kind: "null" as const }];
  return { values, cells, car: (index) => index + shift, front: front ? 0 : null, end: values.length + shift };
}

function forwardLinks(place: Yard): (number | null)[] {
  return place.cells.map((cell, index) => (cell.kind === "car" ? index + 1 : null));
}

function picture(place: Yard, links: (number | null)[], paint: (cell: number) => CellTone | null, pointers: TrainPointer[] = []): LinkedListReverseState {
  return { cells: place.cells, slots: place.cells.map((_, index) => index), links: [...links], tones: place.cells.map((_, cell) => paint(cell) ?? "idle"), pointers };
}

const HOOK = (at: number): TrainPointer => ({ name: "hook", at, tone: "ink" });
const HAND = (at: number): TrainPointer => ({ name: "hand", at, tone: "accent" });
const FLAG = (at: number): TrainPointer => ({ name: "flag", at, tone: "teal" });

function pictureFrames(values: number[]): TrainFrame[] {
  const place = yard(values, false);
  const count = values.length;
  const links = forwardLinks(place);
  const frames: TrainFrame[] = [
    {
      scene: "picture",
      caption: `This train has ${count} cars. Each car's coupling hooks onto the car ahead. The last car points at null, the end.`,
      state: picture(place, links, () => null),
    },
  ];
  if (count >= 3) {
    frames.push({
      scene: "picture",
      caption: `A coupling works one way only. From the car ${values[1]} you can reach the car ${values[2]}, but you can never go back to the car ${values[0]}.`,
      state: picture(place, links, (cell) => (cell === place.car(1) ? "edge" : cell === place.car(2) ? "done" : cell === place.car(0) ? "miss" : null)),
    });
  } else if (count === 2) {
    frames.push({
      scene: "picture",
      caption: `A coupling works one way only. From the car ${values[0]} you can reach the car ${values[1]}, but the car ${values[1]} cannot reach back.`,
      state: picture(place, links, (cell) => (cell === place.car(0) ? "edge" : cell === place.car(1) ? "done" : null)),
    });
  }
  const turned = yard(values, true);
  const back = turned.cells.map((cell, index) => (cell.kind === "car" ? index - 1 : null));
  frames.push({
    scene: "picture",
    caption: `The goal: turn the train round, so that every coupling points the other way. Read from the car ${values[count - 1]}, it becomes ${solve(values)}.`,
    state: picture(turned, back, (cell) => (turned.cells[cell].kind === "car" ? "done" : null)),
  });
  return frames;
}

/** The obvious way, really run: couplings only lead forward, so every car is found by walking from the front again. */
function slowWalk(values: number[]): { frames: TrainFrame[]; walked: number } {
  const place = yard(values, false);
  const links = forwardLinks(place);
  const count = values.length;
  const frames: TrainFrame[] = [];
  const built: number[] = [];
  let walked = 0;
  for (let target = count - 1; target >= 0; target--) {
    for (let at = 0; at <= target; at++) walked++;
    built.push(values[target]);
    const round = count - 1 - target;
    if (round > 2) continue;
    const name = `the car ${values[target]}`;
    frames.push({
      scene: "slow",
      caption:
        round === 0
          ? `The slow way: couplings only lead forward, so walk from the front to find the last car, ${name}. Write it down as the new first car.`
          : round === 1
            ? `Now the car before it. There is no way back, so walk from the front again, to ${name}.`
            : `And again from the front, to ${name}. The same cars are walked past over and over.`,
      state: {
        ...picture(place, links, (cell) => (cell === place.car(target) ? "edge" : cell < place.car(target) ? "window" : place.cells[cell].kind === "car" ? "done" : null)),
        counter: { label: "cars walked past", value: walked },
        note: `new train: ${built.join(" ")}`,
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `For every car, one more walk from the front: ${walked} cars walked past for a train of ${count}. This is O(n²) time: far too slow for 5,000 cars.`,
    state: { ...picture(place, links, (cell) => (place.cells[cell].kind === "car" ? "faded" : null)), counter: { label: "cars walked past", value: walked }, note: `new train: ${built.join(" ")}` },
  });
  return { frames, walked };
}

function insightFrames(values: number[]): TrainFrame[] {
  const place = yard(values, true);
  const links = forwardLinks(place);
  const first = place.car(0);
  const name = (index: number) => `the car ${values[index]}`;
  const frames: TrainFrame[] = [
    {
      scene: "insight",
      caption: "Picture the train. To turn it round, swing every coupling to the car behind instead. Hold one car at a time in your hand.",
      state: picture(place, links, (cell) => (cell === first ? "edge" : null), [HAND(first)]),
    },
  ];
  if (values.length < 2) return frames;
  const swung = [...links];
  swung[first] = place.front;
  const rest = values.slice(1).map((_, index) => place.car(index + 1));
  frames.push({
    scene: "insight",
    caption: `The Orphan Train Trap: swing the coupling of ${name(0)} first, and nothing holds ${name(1)} any more. The rest of the train is lost.`,
    state: { ...picture(place, swung, (cell) => (cell === first ? "miss" : rest.includes(cell) ? "faded" : null), [HAND(first)]), freshLink: first, lost: rest },
  });
  frames.push({
    scene: "insight",
    caption: `So first plant a flag on the car ahead, ${name(1)}. Then swing the coupling. The flag still holds the rest of the train.`,
    state: { ...picture(place, swung, (cell) => (cell === first ? "done" : null), [HAND(first), FLAG(place.car(1))]), freshLink: first },
  });
  frames.push({
    scene: "insight",
    caption: "Then step forward to the flag and do the same again. One car at a time, the whole train turns round.",
    state: picture(place, swung, (cell) => (cell === first ? "done" : cell === place.car(1) ? "edge" : null), [HOOK(first), HAND(place.car(1)), FLAG(place.car(1))]),
  });
  return frames;
}

function flagQuiz(place: Yard, hand: number, behind: number, ahead: number): StoryQuiz {
  const lastCar = ahead === place.end;
  return {
    kind: "cell",
    cells: place.cells.length,
    question: lastCar ? `The hand holds the car ${place.cells[hand].label}. Before its coupling swings, the flag must be planted. Click where it goes.` : `The hand holds the car ${place.cells[hand].label}. Before its coupling swings, one box must get the flag. Click it.`,
    answer: ahead,
    feedback: {
      [hand]: "The hand already holds that car. The flag protects what comes after it.",
      [behind]: "That is behind the hand. Swing there before the flag is planted, and the cars ahead are lost: the Orphan Train Trap.",
    },
    otherwise: "Follow the one coupling that leaves the car in the hand.",
    why: lastCar ? "No car is ahead, so the flag goes on null. The hand will stop when it gets there." : `The flag goes on the car ahead, the car ${place.cells[ahead].label}. Now the coupling can swing and nothing is lost.`,
  };
}

function swingQuiz(place: Yard, hand: number, behind: number, ahead: number): StoryQuiz {
  return {
    kind: "cell",
    cells: place.cells.length,
    question: `Now the coupling of the car ${place.cells[hand].label} swings round. Where must it point? Click that box.`,
    answer: behind,
    feedback: {
      [ahead]: "It points there already. The train is being turned round.",
      [hand]: "A car cannot hook onto itself.",
    },
    otherwise: "Look just behind the hand. Whatever is there is what this car must hook onto.",
    why: behind === place.front ? "Nothing is behind the first car, so its coupling points at null. It becomes the last car." : `It hooks onto the car behind it, the car ${place.cells[behind].label}, which was turned just before.`,
  };
}

/** Follow the couplings the picture ended with, so the stated answer is read off the drawing itself. */
function readTrain(place: Yard, links: (number | null)[], from: number): string {
  const out: string[] = [];
  for (let cell: number | null = from; cell !== null && place.cells[cell].kind === "car" && out.length <= place.cells.length; cell = links[cell]) out.push(place.cells[cell].label);
  return out.join("->");
}

function solutionFrames(values: number[], walked: number): TrainFrame[] {
  const scene: SceneId = "solution";
  const place = yard(values, true);
  const links = forwardLinks(place);
  const frames: TrainFrame[] = [];
  const name = (cell: number) => (place.cells[cell].kind === "car" ? `the car ${place.cells[cell].label}` : "null");
  let hook = place.front ?? 0;
  let hand = place.car(0);
  let flag: number | null = null;
  let fresh: number | null = null;
  const turned = new Set<number>();
  let askedFlag = false;

  const shot = (showHand = true): LinkedListReverseState => ({
    ...picture(place, links, (cell) => (turned.has(cell) ? "done" : showHand && cell === hand && place.cells[cell].kind === "car" ? "edge" : null), [HOOK(hook), ...(showHand ? [HAND(hand)] : []), ...(flag !== null ? [FLAG(flag)] : [])]),
    freshLink: fresh,
  });

  frames.push({
    scene,
    caption: "The hook marks where the next coupling will swing to. It starts on null, in front of the train: no car is turned yet.",
    codeLine: 0,
    state: shot(false),
  });
  frames.push({ scene, caption: `The hand takes the first car, ${name(hand)}.`, codeLine: 1, state: shot() });

  while (hand !== place.end) {
    const ahead = links[hand] ?? place.end;
    const lastCar = ahead === place.end;
    if (!askedFlag || (lastCar && values.length > 1)) frames[frames.length - 1].quiz = flagQuiz(place, hand, hook, ahead);
    const firstTime = !askedFlag;
    askedFlag = true;

    flag = ahead;
    fresh = null;
    frames.push({
      scene,
      caption: lastCar
        ? `Flag first. Nothing is ahead of ${name(hand)}, so the flag goes on null.`
        : firstTime
          ? `Plant the flag on the car ahead, ${name(flag)}. Now the rest of the train cannot get lost.`
          : `Flag first: plant it on ${name(flag)}.`,
      codeLine: 3,
      state: shot(),
    });

    links[hand] = hook;
    turned.add(hand);
    fresh = hand;
    frames.push({
      scene,
      caption: hook === place.front ? `Swing the coupling of ${name(hand)} round to the hook, null. It will be the last car of the new train.` : `Swing the coupling of ${name(hand)} round to the hook, ${name(hook)}.`,
      codeLine: 4,
      state: shot(),
    });

    fresh = null;
    hook = hand;
    frames.push({ scene, caption: `The hook moves up to ${name(hook)}. The turned part of the train now starts there.`, codeLine: 5, state: shot() });

    hand = flag;
    frames.push({
      scene,
      caption: hand === place.end ? "The hand moves to the flag. That is null: no car is left to hold." : `The hand moves to the flag, ${name(hand)}.`,
      codeLine: 6,
      state: shot(),
    });
  }

  const answer = readTrain(place, links, hook);
  if (answer !== solve(values)) throw new Error("reverse-linked-list: the pictured couplings disagree with the solver");
  flag = null;
  frames.push({
    scene,
    caption: `The hook is on the new first car, ${name(hook)}. Follow the couplings from there. The answer is ${answer}.`,
    codeLine: 8,
    state: shot(false),
  });
  frames.push({
    scene,
    caption: `Time: O(n). Each of the ${values.length} cars was in the hand once, and its coupling swung once. The slow way walked past ${walked} cars.`,
    codeLine: 2,
    state: { ...shot(false), counter: { label: "couplings swung", value: turned.size } },
  });
  flag = place.end;
  frames.push({
    scene,
    caption: "Space: O(1). Only three markers are used, however long the train is: the hook, the hand and the flag.",
    codeLine: 0,
    state: shot(),
  });
  return frames;
}

/** The reader plants every flag and swings every coupling. The hook is hidden: finding it is the point. */
function practiceFrames(): TrainFrame[] {
  const scene: SceneId = "card";
  const values = parseTrain(PRACTICE);
  const place = yard(values, true);
  const links = forwardLinks(place);
  const frames: TrainFrame[] = [];
  const name = (cell: number) => (place.cells[cell].kind === "car" ? `the car ${place.cells[cell].label}` : "null");
  let hook = place.front ?? 0;
  let hand = place.car(0);
  let flag: number | null = null;
  let fresh: number | null = null;
  const turned = new Set<number>();
  const shot = (): LinkedListReverseState => ({
    ...picture(place, links, (cell) => (turned.has(cell) ? "done" : cell === hand && place.cells[cell].kind === "car" ? "edge" : null), [HAND(hand), ...(flag !== null ? [FLAG(flag)] : [])]),
    freshLink: fresh,
  });

  frames.push({
    scene,
    caption: `Your turn, on a new train: ${values.join(", ")}. You plant every flag and swing every coupling. The hook is hidden, so you must find it.`,
    state: picture(place, links, () => null),
  });
  while (hand !== place.end) {
    const ahead = links[hand] ?? place.end;
    frames.push({
      scene,
      caption: turned.size === 0 ? `The hand takes the first car, ${name(hand)}.` : `The hand steps forward to the flag, ${name(hand)}.`,
      state: shot(),
      quiz: flagQuiz(place, hand, hook, ahead),
    });
    flag = ahead;
    frames.push({
      scene,
      caption: flag === place.end ? "The flag is on null: no car is ahead." : `The flag is on ${name(flag)}. The rest of the train is safe.`,
      state: shot(),
      quiz: swingQuiz(place, hand, hook, ahead),
    });
    links[hand] = hook;
    turned.add(hand);
    fresh = hand;
    frames.push({
      scene,
      caption: hook === place.front ? `The coupling of ${name(hand)} now points at null. It will be the last car.` : `The coupling of ${name(hand)} now points at ${name(hook)}.`,
      state: shot(),
    });
    fresh = null;
    hook = hand;
    hand = flag;
  }
  flag = null;
  frames.push({
    scene,
    caption: `The hand steps to the flag, null: every car is turned. Read from ${name(hook)}: the new train is ${readTrain(place, links, hook)}.`,
    state: shot(),
  });
  return frames;
}

export const reverseLinkedListStory: ProblemStory<LinkedListReverseState> = {
  slugs: ["lc-206"],
  pattern: "Linked list: turn the links round",
  trigger: "“reverse a singly linked list”, or any task that must turn one-way links round without a second list",
  insight: "A train of one-way couplings. Hold one car: plant a flag on the car ahead, swing the coupling to the hook behind, then step to the flag.",
  metaphor: { name: "The train couplings", legend: "hook = prev · hand = curr · flag = next · coupling = a node's next link", terms: ["car", "coupling", "train", "hook", "hand", "flag"] },
  traps: [{ name: "The Orphan Train Trap", rule: "Save next = curr.next before curr.next = prev. Swing the coupling first and nothing holds the rest of the train." }],
  template: [
    "prev = null; curr = head;",
    "while (curr exists) {",
    "    next = curr.next;      // flag first",
    "    curr.next = prev;      // swing the coupling",
    "    prev = curr; curr = next;",
    "}",
    "prev is the new head;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each car is in the hand once, and its coupling swings once",
    space: "O(1)",
    spaceWhy: "only three markers: the hook, the hand and the flag",
  },
  code: CODE,
  examples: [
    { label: "1->2->3->4->5", input: "1->2->3->4->5", expected: "5->4->3->2->1" },
    { label: "1->2", input: "1->2", expected: "2->1" },
    { label: "6->3->9", input: "6->3->9", expected: "9->3->6" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-25", title: "Reverse Nodes in k-Group" },
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-143", title: "Reorder List" },
  ],
  answer: (input) => solve(parseTrain(input)),
  frames: (input) => {
    const values = parseTrain(input);
    const slow = slowWalk(values);
    const turned = yard(values, true);
    const back = turned.cells.map((cell, index) => (cell.kind === "car" ? index - 1 : null));
    return [
      ...pictureFrames(values),
      ...slow.frames,
      ...insightFrames(values),
      ...solutionFrames(values, slow.walked),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(turned, back, (cell) => (turned.cells[cell].kind === "car" ? "done" : null)),
      },
    ];
  },
  View: LinkedListReverseView,
};
