import type { CellTone } from "@/components/learn/viz/primitives";

import { TrackView, type TrackRunner, type TrackState } from "../rec04-track-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TrackState>;

/** Fresh list for the "your turn" run. The runners meet on 9, but the loop begins at 6 (the trap). */
const PRACTICE = "[5,6,7,8,9], pos=1";

const CODE = [
  "ListNode slow = head;",
  "ListNode fast = head;",
  "while (fast != null && fast.next != null) {",
  "    slow = slow.next;",
  "    fast = fast.next.next;",
  "    if (slow == fast) {",
  "        ListNode friend = head;",
  "        while (friend != slow) {",
  "            friend = friend.next;",
  "            slow = slow.next;",
  "        }",
  "        return friend;",
  "    }",
  "}",
  "return null;",
];

type Task = { values: number[]; pos: number };

function parse(input: string): Task {
  const values = (input.match(/\[([^\]]*)\]/)?.[1] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const raw = Number(input.match(/pos\s*=\s*(-?\d+)/)?.[1] ?? -1);
  const list = values.length ? values : [1];
  return { values: list, pos: Number.isInteger(raw) && raw >= 0 && raw < list.length ? raw : -1 };
}

/** Independent solver: remember every node visited; the first repeat is where the loop begins. */
function solve({ values, pos }: Task): string {
  const n = values.length;
  const seen = new Set<number>();
  for (let node = 0; node < n; node = node + 1 < n ? node + 1 : pos >= 0 ? pos : n) {
    if (seen.has(node)) return String(node);
    seen.add(node);
  }
  return "-1";
}

/** Where each arrow leads. `n` is null. */
function stepper({ values, pos }: Task): (index: number) => number {
  const n = values.length;
  return (index) => (index >= n ? n : index + 1 < n ? index + 1 : pos >= 0 ? pos : n);
}

type Round = { slow: number; fast: number; hop: number[] };
type Chase = { rounds: Round[]; meet: number | null; walk: { friend: number; slow: number }[] };

/** The real algorithm, on indices. Records every round, and every step of the friend. */
function chase(task: Task): Chase {
  const n = task.values.length;
  const next = stepper(task);
  let slow = 0;
  let fast = 0;
  const rounds: Round[] = [];
  while (fast !== n && next(fast) !== n) {
    const hop = [fast, next(fast)];
    slow = next(slow);
    fast = next(next(fast));
    rounds.push({ slow, fast, hop });
    if (slow === fast) {
      let friend = 0;
      const walk = [{ friend, slow }];
      while (friend !== slow) {
        friend = next(friend);
        slow = next(slow);
        walk.push({ friend, slow });
      }
      return { rounds, meet: rounds[rounds.length - 1].slow, walk };
    }
  }
  return { rounds, meet: null, walk: [] };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function base(task: Task, runners: TrackRunner[], paint: (index: number) => CellTone | null = () => null): TrackState {
  return { nodes: task.values.map(String), pos: task.pos, nullBox: task.pos < 0, tones: task.values.map((_, index) => paint(index) ?? "idle"), runners };
}

function runners(slow: number | null, fast: number | null, friend: number | null = null): TrackRunner[] {
  const out: TrackRunner[] = [];
  if (slow !== null) out.push({ name: "tortoise", at: slow, tone: "accent" });
  if (fast !== null) out.push({ name: "hare", at: fast, tone: "ink" });
  if (friend !== null) out.push({ name: "friend", at: friend, tone: "teal" });
  return out;
}

function pictureFrames(task: Task): Frame[] {
  const { values, pos } = task;
  const n = values.length;
  if (pos < 0) {
    return [
      { scene: "picture", caption: `This linked list has ${plural(n, "node")}. Each arrow points to the next node, and the last one points to null. So there is no loop.`, state: base(task, []) },
      { scene: "picture", caption: "The goal: return the index where a loop begins, or -1 when the list ends at null.", state: base(task, []) },
    ];
  }
  return [
    {
      scene: "picture",
      caption: `This linked list has ${plural(n, "node")}. The last node, ${values[n - 1]}, points back to ${values[pos]}. Walking it, you go round a loop forever.`,
      state: { ...base(task, []), hop: [n - 1] },
    },
    {
      scene: "picture",
      caption: `The loop begins at the node ${values[pos]}: the first node you would visit twice. It sits at index ${pos}.`,
      state: base(task, [], (index) => (index === pos ? "done" : null)),
    },
    {
      scene: "picture",
      caption: "The goal: return the index where the loop begins, or -1 when the list ends at null.",
      state: base(task, [], (index) => (index === pos ? "done" : null)),
    },
  ];
}

/** The obvious way, really run: write each node in a notebook until one comes round again. */
function slowFrames(task: Task): Frame[] {
  const { values } = task;
  const n = values.length;
  const next = stepper(task);
  const frames: Frame[] = [];
  const notebook: number[] = [];
  let walker = 0;
  while (walker !== n && !notebook.includes(walker)) {
    notebook.push(walker);
    const upcoming = next(walker);
    const shown = notebook.length <= 3 || upcoming === n || notebook.includes(upcoming);
    if (shown) {
      const skipped = notebook.slice(3, -1).map((index) => values[index]);
      frames.push({
        scene: "slow",
        caption:
          notebook.length === 1
            ? `The slow way: walk the list and write every node in a notebook. First ${values[walker]}.`
            : skipped.length
              ? `Keep walking and writing: ${[...skipped, values[walker]].join(", ")}.`
              : `Write ${values[walker]} in the notebook too.`,
        state: { ...base(task, [{ name: "walker", at: walker, tone: "accent" }], (index) => (index === walker ? "edge" : notebook.includes(index) ? "window" : null)), notebook: [...notebook], counter: { label: "nodes written", value: notebook.length } },
      });
    }
    walker = upcoming;
  }
  const written = notebook.length;
  if (walker === n) {
    frames.push({
      scene: "slow",
      caption: "The walker reached null, and no node came round twice. No loop: the answer is -1.",
      state: { ...base(task, [{ name: "walker", at: n, tone: "accent" }], (index) => (notebook.includes(index) ? "window" : null)), notebook: [...notebook], counter: { label: "nodes written", value: written } },
    });
  } else {
    frames.push({
      scene: "slow",
      caption: `The arrow leads back to ${values[walker]}, which is already in the notebook. The first node seen twice: the loop begins here.`,
      state: { ...base(task, [{ name: "walker", at: walker, tone: "teal" }], (index) => (index === walker ? "done" : notebook.includes(index) ? "window" : null)), notebook: [...notebook], notebookHit: notebook.indexOf(walker), counter: { label: "nodes written", value: written } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `That is O(n) time, but the notebook keeps every node: O(n) extra space. Can we find it with no notebook?`,
    state: { ...base(task, [], () => "faded"), notebook: [...notebook], counter: { label: "nodes written", value: written } },
  });
  return frames;
}

function insightFrames(task: Task, run: Chase): Frame[] {
  const { values, pos } = task;
  const n = values.length;
  if (run.meet === null) {
    const last = run.rounds.at(-1);
    return [
      {
        scene: "insight",
        caption: "Picture a tortoise and a hare. The tortoise walks one node at a time, and the hare jumps two. On a loop, the hare would come round and land on the tortoise.",
        state: base(task, runners(0, 0)),
      },
      {
        scene: "insight",
        caption: "Here the hare runs out of list instead. A list that ends has no loop, so the answer is -1.",
        state: base(task, runners(last?.slow ?? 0, last && last.fast === n ? n : n - 1)),
      },
    ];
  }
  const meet = run.meet;
  const length = n - pos;
  const toEntry = (pos - meet + length) % length;
  return [
    {
      scene: "insight",
      caption: `Picture a tortoise and a hare. The hare runs twice as fast. On a loop it comes round and lands on the tortoise: here on ${values[meet]}.`,
      state: base(task, runners(meet, meet), (index) => (index === meet ? "hit" : null)),
    },
    {
      scene: "insight",
      caption: `Now a friend starts on the first node, while the tortoise stays on ${values[meet]}. From here, both walk one node at a time.`,
      state: base(task, runners(meet, null, 0), (index) => (index === meet ? "hit" : null)),
    },
    {
      scene: "insight",
      caption:
        pos === 0
          ? "The friend starts on the entrance itself, and the runners met there too. They are together at once."
          : `Head to entrance: ${plural(pos, "step")}. Meeting spot round to the entrance: ${plural(toEntry, "step")}${toEntry === pos ? "" : ", then whole laps"}. So they reach the entrance together.`,
      state: base(task, runners(pos, null, pos), (index) => (index === pos ? "done" : null)),
    },
  ];
}

function hareQuiz(task: Task, fast: number): StoryQuiz {
  const n = task.values.length;
  const next = stepper(task);
  const one = next(fast);
  const answer = next(one);
  const feedback: Record<number, string> = {};
  if (one !== answer) feedback[one] = "That is only one arrow. The hare jumps two nodes each round.";
  if (fast !== answer && fast !== one) feedback[fast] = "The hare cannot stay still. It jumps two nodes.";
  return {
    kind: "cell",
    cells: n + (task.pos < 0 ? 1 : 0),
    question: "The tortoise walks one node and the hare jumps two. Where does the hare land? Click that box.",
    answer,
    feedback,
    otherwise: "Start where the hare stands and follow two arrows. On the loop, the arrows lead back round.",
    why: answer === n ? "Two arrows from the hare lead off the end, onto null." : `Two arrows lead to ${task.values[answer]}.`,
  };
}

const entranceQuiz = (values: number[], meet: number): StoryQuiz => ({
  kind: "choice",
  question: `The tortoise and the hare met on ${values[meet]}. Is ${values[meet]} where the loop begins?`,
  options: ["Yes, return it", "Not always: they meet somewhere on the loop"],
  answer: 1,
  why: "The hare catches the tortoise wherever the chase ends. That spot is on the loop, but it need not be the entrance.",
});

function friendQuiz(task: Task, friend: number, slow: number, entry: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  if (slow !== entry) feedback[slow] = "The tortoise does not wait there. Both walk one node.";
  if (friend !== entry) feedback[friend] = "The friend does not stay still. Both walk one node.";
  return {
    kind: "cell",
    cells: task.values.length,
    question: "The friend and the tortoise each walk one node. Where do they meet? Click that box.",
    answer: entry,
    feedback,
    otherwise: "Follow one arrow from the friend, and one from the tortoise.",
    why: `Both arrows lead to ${task.values[entry]}. That is the entrance of the loop.`,
  };
}

function trapFrame(scene: SceneId, task: Task, meet: number, codeLine?: number): Frame {
  return {
    scene,
    caption: `No. Returning ${task.values[meet]} is the Meeting Point Trap: it is inside the loop, not its start. Its index, ${meet}, would be wrong.`,
    ...(codeLine === undefined ? {} : { codeLine }),
    state: { ...base(task, runners(meet, meet), (index) => (index === meet ? "miss" : null)), alert: "✕ the meeting spot is not the start" },
  };
}

function solutionFrames(task: Task, run: Chase): Frame[] {
  const { values, pos } = task;
  const n = values.length;
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  let rounds = 0;
  const counter = () => ({ label: "rounds", value: rounds });

  frames.push({ scene, caption: `The tortoise starts on the first node, ${values[0]}.`, codeLine: 0, state: base(task, runners(0, null)) });
  frames.push({ scene, caption: "The hare starts on the same node.", codeLine: 1, state: base(task, runners(0, 0)) });

  let slow = 0;
  let fast = 0;
  run.rounds.forEach((round, index) => {
    if (index === 0) frames.push({ scene, caption: `The hare is on ${values[fast]}, and a node follows it. So the hare can jump.`, codeLine: 2, state: { ...base(task, runners(slow, fast)), counter: counter() } });
    slow = round.slow;
    const walked: Frame = { scene, caption: `The tortoise walks one node, to ${values[slow]}.`, codeLine: 3, state: { ...base(task, runners(slow, fast)), counter: counter() } };
    if (index === 0) walked.quiz = hareQuiz(task, fast);
    frames.push(walked);
    fast = round.fast;
    rounds += 1;
    const met = slow === fast;
    frames.push({
      scene,
      caption: met ? `The hare jumps two nodes and lands on the tortoise, on ${values[fast]}. So there is a loop.` : `The hare jumps two nodes, to ${fast === n ? "null" : values[fast]}. It is not on the tortoise's node.`,
      codeLine: met ? 5 : 4,
      state: { ...base(task, runners(slow, fast), (cell) => (met && cell === fast ? "hit" : null)), hop: round.hop, counter: counter() },
    });
  });

  if (run.meet === null) {
    frames.push({
      scene,
      caption: fast === n ? "The hare is on null. It ran out of list, so the race stops." : `The hare is on the last node, ${values[fast]}, and null follows it. The race stops.`,
      codeLine: 2,
      state: { ...base(task, runners(slow, fast)), counter: counter() },
    });
    frames.push({ scene, caption: "The hare found the end of the list, so there is no loop. The answer is -1.", codeLine: 14, state: { ...base(task, runners(slow, fast)), counter: counter() } });
  } else {
    const meet = run.meet;
    if (meet !== pos) {
      frames[frames.length - 1].quiz = entranceQuiz(values, meet);
      frames.push(trapFrame(scene, task, meet, 5));
    }
    const walk = run.walk;
    const start: Frame = {
      scene,
      caption: meet === pos ? `A friend starts on the first node, ${values[0]}. The tortoise is already there.` : `A friend starts on the first node, ${values[0]}. The tortoise stays on ${values[meet]}.`,
      codeLine: 6,
      state: base(task, runners(meet, null, 0), (index) => (index === meet ? "hit" : null)),
    };
    frames.push(start);
    for (let step = 1; step < walk.length; step++) {
      if (step === walk.length - 1) frames[frames.length - 1].quiz = friendQuiz(task, walk[step - 1].friend, walk[step - 1].slow, pos);
      const { friend, slow: tortoise } = walk[step];
      frames.push({
        scene,
        caption: `The friend walks to ${values[friend]}, and the tortoise walks to ${values[tortoise]}.`,
        codeLine: 8,
        state: base(task, runners(tortoise, null, friend), (index) => (index === friend && friend === tortoise ? "done" : null)),
      });
    }
    const answer = String(walk[walk.length - 1].friend);
    if (answer !== solve(task)) throw new Error("linked-list-cycle-ii: the chase disagrees with the solver");
    frames.push({
      scene,
      caption: `The friend and the tortoise stand together on ${values[pos]}, the entrance of the loop. It sits at index ${pos}, so the answer is ${answer}.`,
      codeLine: 11,
      state: base(task, runners(pos, null, pos), (index) => (index === pos ? "done" : null)),
    });
  }
  const steps = run.rounds.length + Math.max(run.walk.length - 1, 0);
  frames.push({
    scene,
    caption:
      run.meet === null
        ? `Time: O(n). The hare crosses the list once and finds the end: ${plural(steps, "round")} here.`
        : `Time: O(n). The hare catches the tortoise within about two laps, then the friend walks the list at most once: ${plural(steps, "round")} here.`,
    codeLine: 2,
    state: { ...base(task, run.meet === null ? runners(slow, fast) : runners(pos, null, pos), (index) => (index === pos ? "done" : null)), counter: { label: "rounds", value: steps } },
  });
  frames.push({
    scene,
    caption: "Space: O(1). Only three runners: the tortoise, the hare and the friend. No notebook, however long the list is.",
    codeLine: 0,
    state: base(task, run.meet === null ? runners(slow, fast) : runners(pos, null, pos), (index) => (index === pos ? "done" : null)),
  });
  return frames;
}

/** The reader moves the hare every round, judges the meeting spot, and finds the entrance. */
function practiceFrames(): Frame[] {
  const task = parse(PRACTICE);
  const { values, pos } = task;
  const run = chase(task);
  const scene: SceneId = "card";
  const frames: Frame[] = [];
  frames.push({
    scene,
    caption: `Your turn, on a new list: ${values.join(", ")}, where ${values[values.length - 1]} points back to ${values[pos]}. You move the hare first.`,
    state: base(task, runners(0, 0)),
  });
  let fast = 0;
  for (const round of run.rounds) {
    frames[frames.length - 1].quiz = hareQuiz(task, fast);
    fast = round.fast;
    frames.push({ scene, caption: `The hare lands on ${values[round.fast]}, and the tortoise walks to ${values[round.slow]}.`, state: { ...base(task, runners(round.slow, round.fast)), hop: round.hop } });
  }
  const meet = run.meet ?? 0;
  frames[frames.length - 1].quiz = entranceQuiz(values, meet);
  frames.push(trapFrame(scene, task, meet));
  frames.push({ scene, caption: `So a friend starts on ${values[0]}, and the tortoise stays on ${values[meet]}.`, state: base(task, runners(meet, null, 0)) });
  for (let step = 1; step < run.walk.length; step++) {
    if (step === run.walk.length - 1) frames[frames.length - 1].quiz = friendQuiz(task, run.walk[step - 1].friend, run.walk[step - 1].slow, pos);
    const { friend, slow } = run.walk[step];
    frames.push({ scene, caption: `The friend walks to ${values[friend]}, and the tortoise walks to ${values[slow]}.`, state: base(task, runners(slow, null, friend), (index) => (index === friend && friend === slow ? "done" : null)) });
  }
  frames.push({ scene, caption: `Done. They meet on ${values[pos]}, at index ${pos}, so the answer is ${solve(task)}.`, state: { ...base(task, runners(pos, null, pos), (index) => (index === pos ? "done" : null)), note: { text: `answer: ${solve(task)}`, tone: "teal" } } });
  return frames;
}

export const linkedListCycleIIStory: ProblemStory<TrackState> = {
  slugs: ["lc-142"],
  pattern: "Fast and slow pointers",
  trigger: "“return the node where the cycle begins”, with no extra memory",
  insight: "The tortoise and the hare meet somewhere on the loop. A friend then starts at the head. Walking one node each, the friend and the tortoise meet exactly at the loop's entrance.",
  metaphor: { name: "The tortoise, the hare and a friend", legend: "tortoise = slow · hare = fast · friend = a second slow pointer from the head", terms: ["tortoise", "hare", "friend"] },
  traps: [{ name: "The Meeting Point Trap", rule: "Where the tortoise and the hare meet is inside the loop, not its start. Send a friend from the head and walk both one node at a time until they meet." }],
  template: [
    "slow = fast = head;",
    "while (fast can jump two) {",
    "    slow one step; fast two steps;",
    "    if (they meet) { friend = head; walk friend and slow one step each until equal; return friend; }",
    "}",
    "no loop;",
  ],
  complexity: {
    slow: "O(n)",
    time: "O(n)",
    timeWhy: "the hare catches the tortoise within about two laps, then the friend walks the list at most once",
    space: "O(1)",
    spaceWhy: "three runners, and no notebook of nodes",
  },
  code: CODE,
  examples: [
    { label: "[3,2,0,-4], pos = 1", input: "[3,2,0,-4], pos=1", expected: "1", note: "They meet on -4, but the loop begins at 2" },
    { label: "[1,2,3,4,5,6], pos = 2", input: "[1,2,3,4,5,6], pos=2", expected: "2" },
    { label: "[1,2], pos = 0", input: "[1,2], pos=0", expected: "0" },
    { label: "[1], pos = -1", input: "[1], pos=-1", expected: "-1", note: "No loop" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-141", title: "Linked List Cycle" },
    { slug: "lc-202", title: "Happy Number" },
    { slug: "lc-876", title: "Middle of the Linked List" },
  ],
  answer: (input) => solve(parse(input)),
  frames: (input) => {
    const task = parse(input);
    const run = chase(task);
    return [
      ...pictureFrames(task),
      ...slowFrames(task),
      ...insightFrames(task, run),
      ...solutionFrames(task, run),
      ...practiceFrames(),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: base(task, task.pos < 0 ? [] : runners(task.pos, null, task.pos), (index) => (index === task.pos ? "done" : null)),
      },
    ];
  },
  View: TrackView,
};
