import { LinkedListCycleView, type LinkedListCycleState } from "../linked-list-cycle-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type CycleFrame = StoryFrame<LinkedListCycleState>;

/** Two fresh tracks for the "your turn" run: one that ends (the trap), one that loops (the wrap-around). */
const PRACTICE = "5,6,7;-1 | 4,9,6,8,1;1";

const CODE = [
  "ListNode slow = head;",
  "ListNode fast = head;",
  "while (fast != null && fast.next != null) {",
  "    slow = slow.next;",
  "    fast = fast.next.next;",
  "    if (slow == fast) {",
  "        return true;",
  "    }",
  "}",
  "return false;",
];

type Track = { nodes: number[]; pos: number };

function parseTrack(input: string): Track {
  const [list = "", tail = "-1"] = input.split(";");
  const nodes = list
    .replace(/[[\]]/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const pos = Number(tail.trim());
  const safe = nodes.length ? nodes : [1];
  return { nodes: safe, pos: Number.isInteger(pos) && pos >= 0 && pos < safe.length ? pos : -1 };
}

/** Independent solver: build real nodes, then run the two runners on them. */
type ListNode = { value: number; next: ListNode | null };

function solve({ nodes, pos }: Track): boolean {
  const built: ListNode[] = nodes.map((value) => ({ value, next: null }));
  built.forEach((node, index) => {
    node.next = index + 1 < built.length ? built[index + 1] : pos >= 0 ? built[pos] : null;
  });
  let slow: ListNode | null = built[0] ?? null;
  let fast: ListNode | null = built[0] ?? null;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

/** Where the arrow out of a cell leads. Cell `nodes.length` is the null box. */
function follow({ nodes, pos }: Track, index: number): number {
  if (index + 1 < nodes.length) return index + 1;
  return pos >= 0 ? pos : nodes.length;
}

type Round = { slow: number; from: number; over: number; fast: number; met: boolean };
type Race = { rounds: Round[]; met: number | null; stop: "met" | "hare on null" | "next is null"; slow: number; fast: number };

/** The real race on index arrows. It ends by itself: the hare finds null, or gains one step per round on the loop. */
function race(track: Track): Race {
  const end = track.nodes.length;
  const rounds: Round[] = [];
  let slow = 0;
  let fast = 0;
  while (fast !== end && follow(track, fast) !== end) {
    const from = fast;
    const over = follow(track, fast);
    slow = follow(track, slow);
    fast = follow(track, over);
    rounds.push({ slow, from, over, fast, met: slow === fast });
    if (slow === fast) return { rounds, met: slow, stop: "met", slow, fast };
  }
  return { rounds, met: null, stop: fast === end ? "hare on null" : "next is null", slow, fast };
}

/** The slow way, really walked: a notebook that is read from the top at every node. */
type Walk = { steps: { at: number; looks: number; total: number; notebook: number[]; hit: number | null }[]; total: number };

function walkWithNotebook(track: Track): Walk {
  const end = track.nodes.length;
  const steps: Walk["steps"] = [];
  const notebook: number[] = [];
  let total = 0;
  let at = 0;
  while (at !== end) {
    let looks = 0;
    let hit: number | null = null;
    for (let line = 0; line < notebook.length; line++) {
      looks++;
      if (notebook[line] === at) {
        hit = line;
        break;
      }
    }
    total += looks;
    if (hit === null) notebook.push(at);
    steps.push({ at, looks, total, notebook: [...notebook], hit });
    if (hit !== null) return { steps, total };
    at = follow(track, at);
  }
  steps.push({ at: end, looks: 0, total, notebook: [...notebook], hit: null });
  return { steps, total };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function blank(track: Track): LinkedListCycleState {
  return { nodes: track.nodes, pos: track.pos, slow: null, fast: null };
}

function pictureFrames(track: Track): CycleFrame[] {
  const { nodes, pos } = track;
  const last = nodes[nodes.length - 1];
  const name = (index: number) => `the node ${nodes[index]}`;
  const frames: CycleFrame[] = [{ scene: "picture", caption: "This is a linked list. Each node holds a number and one arrow to the next node.", state: blank(track) }];
  if (pos >= 0) {
    frames.push({
      scene: "picture",
      caption: `Here the last node, ${last}, points back to ${name(pos)}. That makes a loop: following the arrows never ends.`,
      state: { ...blank(track), loopMark: true },
    });
    frames.push({
      scene: "picture",
      caption: `If the last node pointed to null instead, the list would simply end. That is a list with no loop.`,
      state: blank({ nodes, pos: -1 }),
    });
  } else {
    const back = Math.min(1, nodes.length - 1);
    frames.push({ scene: "picture", caption: `Here the last node, ${last}, points to null. Following the arrows stops there, so this list has no loop.`, state: blank(track) });
    frames.push({
      scene: "picture",
      caption: `If the last node pointed back to ${name(back)} instead, the arrows would go round forever. That is a loop.`,
      state: { ...blank({ nodes, pos: back }), loopMark: true },
    });
  }
  frames.push({ scene: "picture", caption: "The goal: answer true if the list has a loop, and false if it ends.", state: pos >= 0 ? { ...blank(track), loopMark: true } : blank(track) });
  return frames;
}

function slowFrames(track: Track, walk: Walk): CycleFrame[] {
  const { nodes } = track;
  const end = nodes.length;
  const frames: CycleFrame[] = [];
  const counter = (value: number) => ({ label: "looks in the notebook", value });
  walk.steps.forEach((step, order) => {
    const state: LinkedListCycleState = { ...blank(track), walker: step.at, notebook: step.notebook, notebookHit: step.hit, counter: counter(step.total) };
    if (step.at === end) {
      frames.push({ scene: "slow", caption: `${order > 3 ? "The same again for every node. Then the" : "The"} walker reaches null, the end. No node came up twice, so this list has no loop.`, state });
    } else if (step.hit !== null) {
      const skipped = order > 3 ? "The same again for every node. Then the" : "The";
      frames.push({ scene: "slow", caption: `${skipped} walker is on the node ${nodes[step.at]} again. It is already in the notebook, so this list has a loop.`, state });
    } else if (order === 0) {
      frames.push({ scene: "slow", caption: `The slow way: walk the list with a notebook. At every node, read the whole notebook, then write the node down. First, the node ${nodes[0]}.`, state });
    } else if (order <= 2) {
      frames.push({ scene: "slow", caption: `Walk to the node ${nodes[step.at]}. Read the notebook: ${plural(step.looks, "look")}. It is new, so write it down.`, state });
    }
  });
  const done: LinkedListCycleState = { ...blank(track), notebook: walk.steps[walk.steps.length - 1].notebook, counter: counter(walk.total) };
  frames.push({
    scene: "slow",
    caption:
      walk.total < 3
        ? "A list this short costs almost nothing. But every new node means reading a longer notebook. This is O(n²) time: far too slow for 10,000 nodes."
        : `That took ${walk.total} looks for ${plural(nodes.length, "node")}, and the notebook gets longer at every step. This is O(n²) time: far too slow for 10,000 nodes.`,
    state: done,
  });
  return frames;
}

function insightFrames(track: Track, run: Race): CycleFrame[] {
  const { nodes, pos } = track;
  const frames: CycleFrame[] = [
    { scene: "insight", caption: "Picture a race on this track. A tortoise takes one step at a time. A hare takes two.", state: { ...blank(track), slow: 0, fast: 0 } },
  ];
  if (run.met === null) {
    const state: LinkedListCycleState = { ...blank(track), slow: run.slow, fast: run.fast };
    frames.push({
      scene: "insight",
      caption: run.rounds.length === 0 ? "This track has an end. The hare finds it before it can even jump." : `This track has an end. The hare runs ahead and finds the end first, after ${plural(run.rounds.length, "round")}.`,
      state,
    });
    frames.push({ scene: "insight", caption: "So a hare that finds null means no loop. Only on a loop could the hare come round and land on the tortoise.", state });
    return frames;
  }
  // How many arrows the hare must still follow to reach the tortoise, once both are on the loop.
  const behind = (round: Round) => {
    let steps = 0;
    for (let at = round.fast; at !== round.slow; at = follow(track, at)) steps++;
    return steps;
  };
  const first = run.rounds.findIndex((round) => round.slow >= pos && round.fast >= pos && !round.met);
  const meeting = `the node ${nodes[run.met]}`;
  const together: LinkedListCycleState = { ...blank(track), slow: run.met, fast: run.met, verdict: "same", gap: 0 };
  if (first < 0) {
    frames.push({ scene: "insight", caption: `On a loop the hare cannot run away. It comes round and lands on the tortoise, here on ${meeting}. That can only happen on a loop.`, state: together });
    return frames;
  }
  const gap = behind(run.rounds[first]);
  frames.push({
    scene: "insight",
    caption: `After ${plural(first + 1, "round")} both are on the loop. Following the arrows, the hare is ${gap} behind the tortoise.`,
    state: { ...blank(track), slow: run.rounds[first].slow, fast: run.rounds[first].fast, gap },
  });
  const after = run.rounds[first + 1];
  if (!after.met) {
    frames.push({
      scene: "insight",
      caption: "Each round the hare gains one step, so the gap shrinks by one. It can never jump past the tortoise.",
      state: { ...blank(track), slow: after.slow, fast: after.fast, gap: behind(after), hop: [after.from, after.over] },
    });
    frames.push({ scene: "insight", caption: `When the gap reaches 0 they stand on the same node, ${meeting}. That can only happen on a loop.`, state: together });
  } else {
    frames.push({ scene: "insight", caption: `Each round the hare gains one step, so the gap shrinks to 0. They stand on the same node, ${meeting}. That can only happen on a loop.`, state: together });
  }
  return frames;
}

function landingQuiz(track: Track, round: Round, slow: number): StoryQuiz {
  const { nodes } = track;
  const feedback: Record<number, string> = {
    [slow]: "That is where the tortoise stands. The hare jumps from its own node.",
    [round.from]: "The hare does not stand still. It follows two arrows.",
    [round.over]: "That is only one step. The hare takes two.",
  };
  delete feedback[round.fast];
  return {
    kind: "cell",
    cells: nodes.length + (track.pos >= 0 ? 0 : 1),
    question: `The hare is on the node ${nodes[round.from]}. It jumps two. Where does it land? Click that box.`,
    answer: round.fast,
    feedback,
    otherwise: "Start on the hare's node and follow the arrows, one step and then one more.",
    why: round.fast === nodes.length ? "Two arrows from the hare's node lead to null, the end of the track." : `Two arrows from the hare's node lead to the node ${nodes[round.fast]}.`,
  };
}

function voidQuiz(track: Track, fast: number, again: boolean): StoryQuiz {
  const { nodes } = track;
  const feedback: Record<number, string> = {};
  for (let index = 0; index < nodes.length; index++) feedback[index] = index === fast ? "That is where the hare stands now. Look one arrow ahead." : "No arrow leads from the hare to that node.";
  return {
    kind: "cell",
    cells: nodes.length + 1,
    question: `The hare wants to jump two${again ? " again" : ""}. First look at its very next step. Click what is there.`,
    answer: nodes.length,
    feedback,
    otherwise: "Follow the one arrow that leaves the hare's node.",
    why: "The very next step is null. There is no node there to jump from, so the hare must not jump.",
  };
}

function solutionFrames(track: Track, run: Race, slowLooks: number): CycleFrame[] {
  const { nodes } = track;
  const end = nodes.length;
  const scene: SceneId = "solution";
  const frames: CycleFrame[] = [];
  const name = (index: number) => (index === end ? "null" : `the node ${nodes[index]}`);
  let slow = 0;
  let fast = 0;
  let askedLanding = false;
  const at = (extra: Partial<LinkedListCycleState> = {}): LinkedListCycleState => ({ ...blank(track), slow, fast, ...extra });

  frames.push({ scene, caption: `The tortoise starts on the first node, ${name(0)}.`, codeLine: 0, state: { ...blank(track), slow: 0 } });
  frames.push({ scene, caption: "The hare starts there too. The race is ready.", codeLine: 1, state: at() });

  run.rounds.forEach((round, order) => {
    if (order < 2) {
      frames.push({
        scene,
        caption: `Check the hare first. It stands on ${name(fast)}, and its next step, ${name(round.over)}, is a real node too. It is safe to jump.`,
        codeLine: 2,
        state: at({ hop: [round.from] }),
      });
    }
    slow = round.slow;
    const step: CycleFrame = { scene, caption: `Round ${order + 1}. The tortoise takes one step, to ${name(slow)}.`, codeLine: 3, state: at() };
    if (!askedLanding) {
      askedLanding = true;
      step.quiz = landingQuiz(track, round, slow);
    }
    frames.push(step);
    fast = round.fast;
    frames.push({
      scene,
      caption: fast === end ? `The hare jumps two: over ${name(round.over)}, onto null. That is the end of the track.` : `The hare jumps two: over ${name(round.over)}, onto ${name(fast)}.`,
      codeLine: 4,
      state: at({ hop: [round.from, round.over] }),
    });
    if (round.met) {
      frames.push({ scene, caption: `Are the tortoise and the hare on the same node? Yes: both stand on ${name(slow)}.`, codeLine: 5, state: at({ verdict: "same" }) });
    } else if (fast !== end) {
      frames.push({ scene, caption: `Are they on the same node? No. The tortoise is on ${name(slow)}, the hare on ${name(fast)}.`, codeLine: 5, state: at({ verdict: "apart" }) });
    }
  });

  if (run.stop === "met") {
    frames.push({ scene, caption: "Only a loop can bring the hare round to the tortoise again. The answer is true.", codeLine: 6, state: at({ verdict: "same" }) });
  } else {
    if (run.stop === "next is null") {
      // The reader predicts the failed check on the frame before it.
      frames[frames.length - 1].quiz = voidQuiz(track, fast, run.rounds.length > 0);
      frames.push({ scene, caption: `Check the hare first. It stands on ${name(fast)}, but its very next step is null. There is no node to jump over.`, codeLine: 2, state: at({ hop: [fast] }) });
      frames.push({
        scene,
        caption: "The Null Pointer Void: jump anyway, and the hare leaps from null into nothing. The program crashes. So the race always checks before it jumps.",
        codeLine: 2,
        state: at({ hop: [fast], voidFrom: fast }),
      });
    } else {
      frames.push({ scene, caption: "Check the hare first. It stands on null, the end of the track. There is nothing to jump from.", codeLine: 2, state: at() });
      frames.push({
        scene,
        caption: "The Null Pointer Void: ask null for its next step, and the program crashes. So the race checks the hare before every round.",
        codeLine: 2,
        state: at({ voidFrom: end }),
      });
    }
    frames.push({ scene, caption: "The hare found the end of the track, so there is no loop. The answer is false.", codeLine: 9, state: at() });
  }

  const rounds = run.rounds.length;
  frames.push({
    scene,
    caption:
      slowLooks > rounds
        ? `Time: O(n). The race took ${plural(rounds, "round")} for ${plural(nodes.length, "node")}, against ${slowLooks} looks the slow way. It never needs more rounds than nodes.`
        : `Time: O(n). The race took ${plural(rounds, "round")} for ${plural(nodes.length, "node")}. It never needs more rounds than nodes, however long the track is.`,
    codeLine: 2,
    state: at({ counter: { label: "rounds", value: rounds }, verdict: run.met !== null ? "same" : null }),
  });
  frames.push({
    scene,
    caption: "Space: O(1). Only the tortoise and the hare are remembered, however long the track is. There is no notebook.",
    codeLine: 0,
    state: at({ verdict: run.met !== null ? "same" : null }),
  });
  return frames;
}

/** The reader moves the hare every time, first on a track that ends, then on one that loops. */
function practiceFrames(): CycleFrame[] {
  const scene: SceneId = "card";
  const frames: CycleFrame[] = [];
  PRACTICE.split("|").forEach((part, order) => {
    const track = parseTrack(part);
    const run = race(track);
    const { nodes } = track;
    const end = nodes.length;
    const name = (index: number) => (index === end ? "null" : `the node ${nodes[index]}`);
    let slow = 0;
    let fast = 0;
    const at = (extra: Partial<LinkedListCycleState> = {}): LinkedListCycleState => ({ ...blank(track), slow, fast, ...extra });
    frames.push({
      scene,
      caption: order === 0 ? `Your turn, on two new tracks. The first is ${nodes.join(", ")}. The tortoise moves by itself, and you move the hare.` : `The second track is ${nodes.join(", ")}. You move the hare again.`,
      state: at(),
    });
    for (const round of run.rounds) {
      slow = round.slow;
      frames.push({ scene, caption: `The tortoise steps to ${name(slow)}.`, state: at(), quiz: landingQuiz(track, round, slow) });
      fast = round.fast;
      const landed = `The hare lands on ${name(fast)}.`;
      frames.push({
        scene,
        caption: round.met ? `${landed} The tortoise is there too.` : fast === end ? `${landed} That is the end of the track.` : `${landed} The tortoise is on ${name(slow)}, so the race goes on.`,
        state: at({ hop: [round.from, round.over], verdict: round.met ? "same" : null }),
      });
    }
    if (run.stop === "next is null") {
      frames[frames.length - 1].quiz = voidQuiz(track, fast, run.rounds.length > 0);
      frames.push({
        scene,
        caption: "The next step is null, so the hare must not jump. Jumping anyway is the Null Pointer Void. The track ends here: no loop.",
        state: at({ hop: [fast], voidFrom: fast }),
      });
    } else if (run.stop === "hare on null") {
      frames.push({ scene, caption: "The hare stands on null and must not be asked for a next step: the Null Pointer Void. The track ends here: no loop.", state: at({ voidFrom: end }) });
    } else {
      frames.push({ scene, caption: "Done. The hare came round and landed on the tortoise, so this track has a loop. You moved the hare every time.", state: at({ verdict: "same" }) });
    }
  });
  return frames;
}

export const linkedListCycleStory: ProblemStory<LinkedListCycleState> = {
  slugs: ["lc-141", "cycle-in-a-chain"],
  pattern: "Fast and slow pointers",
  trigger: "“does this linked list loop back on itself?”, with no extra memory allowed",
  insight: "A tortoise and a hare race along the arrows. If the track ends, the hare finds null first. If it loops, the hare comes round and lands on the tortoise.",
  metaphor: { name: "The tortoise and the hare", legend: "tortoise = slow (1 step) · hare = fast (2 steps) · track = the list", terms: ["tortoise", "hare", "track", "race"] },
  traps: [{ name: "The Null Pointer Void", rule: "Before every jump check both fast != null and fast.next != null. On a track that ends, a hare that jumps from null crashes the program." }],
  template: [
    "slow = head; fast = head;",
    "while (fast and fast.next are real nodes) {",
    "    slow moves 1 step; fast moves 2 steps;",
    "    if (slow == fast) they met;   // here: a loop",
    "}",
    "fast fell off the end;           // here: no loop",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "the hare finds the end in n/2 rounds, or gains one step per round on the loop: never more rounds than nodes",
    space: "O(1)",
    spaceWhy: "only the two runners are remembered; there is no notebook",
  },
  code: CODE,
  examples: [
    { label: "3→2→0→-4, back to 2", input: "3,2,0,-4;1", expected: "true" },
    { label: "1→2, back to 1", input: "1,2;0", expected: "true" },
    { label: "1 alone, no loop", input: "1;-1", expected: "false", note: "Tricky: the hare cannot even jump once" },
    { label: "1→2→3→4, no loop", input: "1,2,3,4;-1", expected: "false" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-234", title: "Palindrome Linked List" },
    { slug: "lc-143", title: "Reorder List" },
    { slug: "lc-19", title: "Remove Nth Node From End of List" },
  ],
  answer: (input) => String(solve(parseTrack(input))),
  frames: (input) => {
    const track = parseTrack(input);
    const run = race(track);
    if ((run.met !== null) !== solve(track)) throw new Error("linked-list-cycle: the pictured race disagrees with the solver");
    const walk = walkWithNotebook(track);
    const final: LinkedListCycleState = run.met !== null ? { ...blank(track), slow: run.met, fast: run.met, verdict: "same" } : { ...blank(track), slow: run.slow, fast: run.fast };
    return [
      ...pictureFrames(track),
      ...slowFrames(track, walk),
      ...insightFrames(track, run),
      ...solutionFrames(track, run, walk.total),
      ...practiceFrames(),
      { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: final },
    ];
  },
  View: LinkedListCycleView,
};
