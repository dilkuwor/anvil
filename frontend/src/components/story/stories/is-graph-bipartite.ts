import { TwoTablesView, type TwoTablesState } from "../rec07-two-tables-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<TwoTablesState>;

/** Fresh party for the "your turn" run: two separate pairs, so the loop must start a second time. */
const PRACTICE = "[[1],[0],[3],[2]]";

const CODE = [
  "int n = graph.length;",
  "int[] color = new int[n];",
  "for (int start = 0; start < n; start++) {",
  "    if (color[start] != 0) continue;",
  "    color[start] = 1;",
  "    Deque<Integer> queue = new ArrayDeque<>();",
  "    queue.add(start);",
  "    while (!queue.isEmpty()) {",
  "        int node = queue.poll();",
  "        for (int next : graph[node]) {",
  "            if (color[next] == 0) {",
  "                color[next] = -color[node];",
  "                queue.add(next);",
  "            } else if (color[next] == color[node]) {",
  "                return false;",
  "            }",
  "        }",
  "    }",
  "}",
  "return true;",
];

const TABLE = (side: number) => (side === 1 ? "A" : "B");

function parse(input: string): number[][] {
  return JSON.parse(input.trim()) as number[][];
}

function edgesOf(graph: number[][]): [number, number][] {
  const edges: [number, number][] = [];
  graph.forEach((list, u) => list.forEach((v) => u < v && edges.push([u, v])));
  return edges;
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function blank(graph: number[][]): TwoTablesState {
  return { n: graph.length, edges: edgesOf(graph), table: graph.map(() => 0), active: null, look: null, line: null, clash: null };
}

function list(items: number[]): string {
  if (items.length === 1) return `guest ${items[0]}`;
  return `guests ${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

type Seated = { table: number[]; clash: [number, number] | null };

/** The real two-colouring, from every guest still without a table. */
function seat(graph: number[][]): Seated {
  const table = graph.map(() => 0);
  for (let start = 0; start < graph.length; start++) {
    if (table[start] !== 0) continue;
    table[start] = 1;
    const line = [start];
    while (line.length) {
      const node = line.shift()!;
      for (const next of graph[node]) {
        if (table[next] === 0) {
          table[next] = -table[node];
          line.push(next);
        } else if (table[next] === table[node]) {
          return { table, clash: [node, next] };
        }
      }
    }
  }
  return { table, clash: null };
}

/** Independent check: try every seating (only used on small examples). */
function canSplit(graph: number[][]): boolean {
  const n = graph.length;
  for (let split = 0; split < 1 << n; split++) {
    if (graph.every((neighbours, u) => neighbours.every((v) => ((split >> u) & 1) !== ((split >> v) & 1)))) return true;
  }
  return false;
}

function pictureFrames(graph: number[][]): Frame[] {
  const base = blank(graph);
  const frames: Frame[] = [{ scene: "picture", caption: "Each circle is a guest at a party. A line joins two guests who argue.", state: base }];
  const first = base.edges[0];
  if (first) {
    const [a, b] = first;
    const allowed = graph.map((_, index) => (index === a ? 1 : index === b ? -1 : 0));
    frames.push({
      scene: "picture",
      caption: `Allowed: guests ${a} and ${b} argue, so they sit at different tables.`,
      state: { ...base, table: allowed, fine: [a, b] },
    });
    const bad = graph.map((_, index) => (index === a || index === b ? 1 : 0));
    frames.push({
      scene: "picture",
      caption: `Not allowed: guests ${a} and ${b} at the same table. They would argue all evening.`,
      state: { ...base, table: bad, clash: [a, b] },
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: seat every guest at table A or table B, with no argument at one table. Can it be done? Answer yes or no.",
    state: base,
  });
  return frames;
}

function slowFrames(graph: number[][]): Frame[] {
  const base = blank(graph);
  const n = graph.length;
  const frames: Frame[] = [];
  let checks = 0;
  let found = -1;
  const shown = 3;
  for (let split = 0; split < 1 << n; split++) {
    const table = graph.map((_, index) => (((split >> index) & 1) === 0 ? 1 : -1));
    let clash: [number, number] | null = null;
    for (const [a, b] of base.edges) {
      checks++;
      if (table[a] === table[b]) {
        clash = [a, b];
        break;
      }
    }
    if (!clash) found = split;
    if (split < shown || !clash) {
      frames.push({
        scene: "slow",
        caption: clash
          ? split === 0
            ? `The slow way: try every seating. Seating 1 puts everyone at table A. Guests ${clash[0]} and ${clash[1]} argue at one table.`
            : `Seating ${split + 1}: guests ${clash[0]} and ${clash[1]} still argue at one table. Try the next seating.`
          : `Seating ${split + 1} works: no argument at one table. So the answer is yes.`,
        state: { ...base, table, clash, counter: { label: "arguments checked", value: checks } },
      });
    }
    if (!clash) break;
  }
  if (found < 0) {
    frames.push({
      scene: "slow",
      caption: `All ${1 << n} seatings fail, so the answer is no. That took ${checks} argument checks.`,
      state: { ...base, table: graph.map(() => 1), counter: { label: "arguments checked", value: checks } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `With n guests there are 2 to the power n seatings. This is O(2^n · (V + E)) time: 100 guests would take forever.`,
    state: { ...base, counter: { label: "arguments checked", value: checks } },
  });
  return frames;
}

function insightFrames(graph: number[][]): Frame[] {
  const base = blank(graph);
  const frames: Frame[] = [];
  const first = graph.map((_, index) => (index === 0 ? 1 : 0));
  frames.push({ scene: "insight", caption: "Picture two tables at the party. Seat guest 0 at table A. That is the only free choice.", state: { ...base, table: first, active: 0 } });
  const neighbours = graph[0] ?? [];
  if (neighbours.length) {
    const forced = first.map((side, index) => (neighbours.includes(index) ? -1 : side));
    frames.push({
      scene: "insight",
      caption: `Everyone who argues with guest 0 now has no choice: ${list(neighbours)} must sit at table B.`,
      state: { ...base, table: forced, active: 0 },
    });
  }
  const done = seat(graph);
  frames.push({
    scene: "insight",
    caption: done.clash
      ? `Keep seating like this. Guests ${done.clash[0]} and ${done.clash[1]} are forced to one table, and they argue. Nothing was a guess, so no seating can work.`
      : "Keep seating like this. Every seat is forced, and no argument lands at one table, so a seating exists.",
    state: { ...base, table: done.table, clash: done.clash },
  });
  return frames;
}

function tableQuiz(n: number, node: number, side: number, next: number): StoryQuiz {
  const own = side === 1 ? n : n + 1;
  return {
    kind: "cell",
    cells: n + 2,
    question: `Guest ${node} sits at table ${TABLE(side)}. Guest ${next} argues with guest ${node}. Which table must guest ${next} sit at? Click it.`,
    answer: side === 1 ? n + 1 : n,
    feedback: { [own]: `Guest ${node} already sits at table ${TABLE(side)}. Two guests who argue cannot share a table.` },
    otherwise: "The answer is one of the two tables on the right: the one without the guest they argue with.",
    why: `Table ${TABLE(-side)}, the other one. The seat was forced, not chosen.`,
  };
}

function checkQuiz(node: number, next: number): StoryQuiz {
  return {
    kind: "choice",
    question: `Guest ${next} already has a table. Is the argument between guests ${node} and ${next} fine, or a clash?`,
    options: ["Fine: they sit at different tables", "A clash: they sit at the same table"],
    answer: 0,
    why: "Compare the two tables. Different tables means fine; the same table means the seating cannot work.",
  };
}

function clashQuiz(node: number, next: number): StoryQuiz {
  return { ...checkQuiz(node, next), answer: 1, why: "They share a table and they argue. Every seat was forced, so the answer is no." };
}

function startQuiz(n: number, start: number, table: number[]): StoryQuiz {
  const feedback: Record<number, string> = {};
  table.forEach((side, index) => {
    if (side !== 0) feedback[index] = `Guest ${index} already sits at table ${TABLE(side)}. The loop skips seated guests.`;
  });
  return {
    kind: "cell",
    cells: n + 2,
    question: "The waiting line is empty. Which guest does the loop seat next? Click that guest.",
    answer: start,
    feedback,
    otherwise: "Go through the guests in order and find the first one with no table yet.",
    why: "The first guest with no table. They were never reached, so the loop starts again there.",
  };
}

/** The real algorithm, one frame per change. `practice` asks at every decision and shows no code. */
function solutionFrames(graph: number[][], scene: SceneId = "solution", practice = false): Frame[] {
  const base = blank(graph);
  const n = graph.length;
  const table = graph.map(() => 0);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = { table: false, check: false, start: false };
  let queue: number[] = [];
  let looks = 0;
  const at = (extra: Partial<TwoTablesState> = {}): TwoTablesState => ({ ...base, table: [...table], line: [...queue], ...extra });

  frames.push({
    scene,
    caption: practice ? `Your turn, at a new party with ${n} guests. You choose every seat.` : "No guest has a table yet. The loop goes through the guests in order.",
    codeLine: line(1),
    state: at(),
  });

  for (let start = 0; start < n; start++) {
    if (table[start] !== 0) continue;
    if (start > 0) {
      const left = table.map((side, index) => (side === 0 ? index : -1)).filter((index) => index >= 0);
      const ask: Frame = {
        scene,
        caption: "The waiting line is empty. The loop moves on through the guests.",
        codeLine: line(2),
        state: at(),
      };
      if (practice || !asked.start) {
        ask.quiz = startQuiz(n, start, table);
        asked.start = true;
      }
      frames.push(ask);
      frames.push({
        scene,
        caption: practice
          ? `${capital(list(left))} still ${left.length === 1 ? "has" : "have"} no table. Stopping now is the Single Start Trap.`
          : `The Single Start Trap: stopping here would answer yes, but ${list(left)} still ${left.length === 1 ? "has" : "have"} no table. They were never reached.`,
        codeLine: line(3),
        state: at({ unseated: left }),
      });
    }
    table[start] = 1;
    queue = [start];
    frames.push({
      scene,
      caption: start === 0 ? `Seat guest ${start} at table A and put them in the waiting line.` : `The loop starts again: seat guest ${start} at table A and put them in the waiting line.`,
      codeLine: line(4),
      state: at(),
    });
    while (queue.length) {
      const node = queue.shift()!;
      frames.push({
        scene,
        caption: `Guest ${node} leaves the waiting line. Look at everyone guest ${node} argues with.`,
        codeLine: line(8),
        state: at({ active: node }),
      });
      for (const next of graph[node]) {
        looks++;
        if (table[next] === 0) {
          if (practice || !asked.table) {
            asked.table = true;
            frames.push({
              scene,
              caption: `Guest ${next} argues with guest ${node} and has no table yet.`,
              codeLine: line(10),
              state: at({ active: node, look: next }),
              quiz: tableQuiz(n, node, table[node], next),
            });
          }
          table[next] = -table[node];
          queue.push(next);
          frames.push({
            scene,
            caption: `Guest ${next} must sit at table ${TABLE(table[next])}, the other table, and joins the waiting line.`,
            codeLine: line(11),
            state: at({ active: node, look: next, fine: [node, next] }),
          });
          continue;
        }
        const clash = table[next] === table[node];
        if (practice || !asked.check) {
          asked.check = true;
          frames.push({
            scene,
            caption: `Guest ${next} argues with guest ${node} and already sits at a table.`,
            codeLine: line(13),
            state: at({ active: node, look: next }),
            quiz: clash ? clashQuiz(node, next) : checkQuiz(node, next),
          });
        }
        if (clash) {
          frames.push({
            scene,
            caption: practice
              ? `Guests ${node} and ${next} argue at table ${TABLE(table[node])}. A clash: the answer is no.`
              : `Guests ${node} and ${next} both sit at table ${TABLE(table[node])}, and they argue. A clash, so the answer is false.`,
            codeLine: line(14),
            state: at({ active: node, look: next, clash: [node, next] }),
          });
          return practice ? frames : [...frames, ...costFrames(base, table, looks, [node, next])];
        }
        frames.push({
          scene,
          caption: `Guest ${next} sits at table ${TABLE(table[next])} and guest ${node} at table ${TABLE(table[node])}. This argument is fine.`,
          codeLine: line(13),
          state: at({ active: node, look: next, fine: [node, next] }),
        });
      }
    }
  }
  queue = [];
  frames.push({
    scene,
    caption: practice ? "Every guest has a table and no argument is at one table. The answer is yes." : "Every guest has a table, and no argument is at one table. The answer is true.",
    codeLine: line(19),
    state: at(),
  });
  return practice ? frames : [...frames, ...costFrames(base, table, looks, null)];
}

function costFrames(base: TwoTablesState, table: number[], looks: number, clash: [number, number] | null): Frame[] {
  return [
    {
      scene: "solution",
      caption: `Time: O(V + E). Each guest joins the waiting line once, and each argument is looked at from both ends. Here: ${looks} looks.`,
      codeLine: 9,
      state: { ...base, table: [...table], clash, counter: { label: "arguments looked at", value: looks } },
    },
    {
      scene: "solution",
      caption: "Space: O(V). The table list and the waiting line hold at most one entry per guest.",
      codeLine: 1,
      state: { ...base, table: [...table], clash, line: [] },
    },
  ];
}

export const isGraphBipartiteStory: ProblemStory<TwoTablesState> = {
  slugs: ["lc-785"],
  pattern: "Two-colouring with BFS",
  trigger: "split the nodes into two groups so that every edge joins the two groups",
  insight: "Two tables at a party. Seat one guest, and everyone who argues with them is forced to the other table. A pair that argues at the same table means it cannot be done.",
  metaphor: {
    name: "The two tables",
    legend: "guest = node · argue = edge · table A / B = color 1 / -1 · waiting line = queue",
    terms: ["guest", "table", "seat", "argue", "waiting line"],
  },
  traps: [{ name: "The Single Start Trap", rule: "The guests can form separate groups. Loop over every guest and start seating again at each one who has no table yet." }],
  template: [
    "for (each node with no colour) {",
    "    colour it; put it in a queue;",
    "    while (queue not empty) take a node:",
    "        uncoloured neighbour → other colour, add to queue;",
    "        same-coloured neighbour → return false;",
    "}",
    "return true;",
  ],
  complexity: {
    slow: "O(2^n · (V + E))",
    time: "O(V + E)",
    timeWhy: "each guest joins the waiting line once; each argument is looked at from both ends",
    space: "O(V)",
    spaceWhy: "one table entry per guest, and the waiting line",
  },
  code: CODE,
  examples: [
    { label: "a triangle inside", input: "[[1,2,3],[0,2],[0,1,3],[0,2]]", expected: "false" },
    { label: "a square", input: "[[1,3],[0,2],[1,3],[0,2]]", expected: "true" },
    { label: "two separate groups", input: "[[1],[0],[3,4],[2,4],[2,3]]", expected: "false", note: "Tricky: the loop must start a second time" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-207", title: "Course Schedule" },
    { slug: "lc-200", title: "Number of Islands" },
    { slug: "lc-547", title: "Number of Provinces" },
  ],
  answer: (input) => String(canSplit(parse(input))),
  frames: (input) => {
    const graph = parse(input);
    const done = seat(graph);
    return [
      ...pictureFrames(graph),
      ...slowFrames(graph),
      ...insightFrames(graph),
      ...solutionFrames(graph),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(graph), table: done.table, clash: done.clash },
      },
    ];
  },
  View: TwoTablesView,
};
