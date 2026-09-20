import { CourseGraphView, type CourseGraphState } from "../course-graph-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type CourseFrame = StoryFrame<CourseGraphState>;

/** Fresh courses for the "your turn" run: course 1 has two blockers, and courses 1, 2, 3 wait for each other in a circle. */
const PRACTICE = "numCourses=5, prereq=[[1,0],[2,1],[3,2],[1,3],[4,0]]";

const CODE = [
  "boolean canFinish(int numCourses, int[][] prerequisites) {",
  "    int[] blockedBy = new int[numCourses];",
  "    List<List<Integer>> unlocks = new ArrayList<>();",
  "    for (int i = 0; i < numCourses; i++) unlocks.add(new ArrayList<>());",
  "    for (int[] p : prerequisites) {",
  "        unlocks.get(p[1]).add(p[0]);      // p[1] must fall before p[0]",
  "        blockedBy[p[0]]++;",
  "    }",
  "    Deque<Integer> free = new ArrayDeque<>();",
  "    for (int i = 0; i < numCourses; i++)",
  "        if (blockedBy[i] == 0) free.add(i);",
  "    int fallen = 0;",
  "    while (!free.isEmpty()) {",
  "        int course = free.poll();",
  "        fallen++;",
  "        for (int next : unlocks.get(course)) {",
  "            blockedBy[next]--;",
  "            if (blockedBy[next] == 0) free.add(next);",
  "        }",
  "    }",
  "    return fallen == numCourses;",
  "}",
];
const LINE = { counts: 1, count: 6, firstFree: 10, loop: 12, fall: 13, arrows: 15, lose: 16, join: 17, answer: 20 };

type Graph = { count: number; edges: [number, number][]; unlocks: number[][]; needs: number[][] };

function parse(input: string): Graph {
  const count = Math.max(1, Number(input.match(/numCourses\s*=\s*(\d+)/)?.[1] ?? 1));
  const edges: [number, number][] = [];
  for (const match of input.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)) {
    const course = Number(match[1]);
    const before = Number(match[2]);
    if (course < count && before < count) edges.push([before, course]);
  }
  const unlocks: number[][] = Array.from({ length: count }, () => []);
  const needs: number[][] = Array.from({ length: count }, () => []);
  for (const [before, course] of edges) {
    unlocks[before].push(course);
    needs[course].push(before);
  }
  return { count, edges, unlocks, needs };
}

const list = (items: number[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const dominoes = (count: number) => `${count} ${count === 1 ? "domino" : "dominoes"}`;

/** Independent solver: keep taking any course whose needs are all done, until a whole round takes nothing. No counts, no line. */
function finishable(graph: Graph): Set<number> {
  const done = new Set<number>();
  for (let progress = true; progress; ) {
    progress = false;
    for (let course = 0; course < graph.count; course++) {
      if (!done.has(course) && graph.needs[course].every((before) => done.has(before))) {
        done.add(course);
        progress = true;
      }
    }
  }
  return done;
}

const blockers = (graph: Graph) => graph.needs.map((before) => before.length);

function plain(graph: Graph, extra: Partial<CourseGraphState> = {}): CourseGraphState {
  return { numCourses: graph.count, edges: graph.edges, blockedBy: null, fallen: [], free: null, ...extra };
}

function pictureFrames(graph: Graph): CourseFrame[] {
  const first = graph.edges[0];
  const frames: CourseFrame[] = [
    {
      scene: "picture",
      caption: first
        ? `There are ${graph.count} courses. An arrow from course ${first[0]} to course ${first[1]} means: finish ${first[0]} before you start ${first[1]}.`
        : `There are ${graph.count} courses, and none of them needs another one first.`,
      state: plain(graph),
    },
  ];
  const counts = blockers(graph);
  const open = counts.indexOf(0);
  if (open !== -1) {
    frames.push({ scene: "picture", caption: `No arrow points into course ${open}. It needs nothing first, so it can be taken right away.`, state: plain(graph, { mark: { nodes: [open], tone: "teal" } }) });
  }
  const most = counts.indexOf(Math.max(...counts));
  if (counts[most] > 0) {
    const before = graph.needs[most];
    frames.push({
      scene: "picture",
      caption:
        before.length === 1
          ? `An arrow points into course ${most}. It may not start until course ${before[0]} is finished.`
          : `${before.length} arrows point into course ${most}. It may not start until courses ${list(before)} are ${before.length === 2 ? "both" : "all"} finished.`,
      state: plain(graph, { mark: { nodes: [most], tone: "coral" } }),
    });
  }
  frames.push({ scene: "picture", caption: "The goal: can every course be finished, one after another? Answer true or false.", state: plain(graph) });
  return frames;
}

/** Slow but correct: from EVERY course, walk back through all it needs, remembering nothing between walks. */
function slowFrames(graph: Graph): { frames: CourseFrame[]; checked: number } {
  const frames: CourseFrame[] = [
    {
      scene: "slow",
      caption: "The slow way: take each course in turn and walk back along the arrows through everything it needs first. Check that every walk comes to an end.",
      state: plain(graph, { counter: { label: "courses checked", value: 0 } }),
    },
  ];
  let checked = 0;
  let loopFound = false;
  for (let start = 0; start < graph.count && !loopFound; start++) {
    const order: number[] = [];
    const path = new Set<number>();
    const walk = (course: number): boolean => {
      order.push(course);
      checked++;
      if (path.has(course)) return false;
      path.add(course);
      const fine = graph.needs[course].every(walk);
      path.delete(course);
      return fine;
    };
    loopFound = !walk(start);
    const shown = start === 0 || loopFound || start >= graph.count - 2;
    if (!shown) continue;
    const through = loopFound ? order.slice(1, -1) : order.slice(1);
    frames.push({
      scene: "slow",
      caption: loopFound
        ? `From course ${start} we walk back${through.length > 0 ? ` through ${through.join(", ")}` : ""} and stand on course ${order[order.length - 1]} again. It waits for itself, so it can never be taken.`
        : through.length === 0
          ? `Course ${start} needs nothing. Its walk is over after 1 course checked.`
          : `From course ${start} we walk back through ${through.join(", ")}. Nothing was remembered from earlier walks, so the same courses get checked again.`,
      state: plain(graph, { active: start, walked: order, stuck: loopFound ? [order[order.length - 1]] : [], counter: { label: "courses checked", value: checked } }),
    });
  }
  frames.push({
    scene: "slow",
    caption: loopFound
      ? `The slow way stops with the answer false, after ${checked} courses checked. With V courses and E arrows, walking back from every course can cost O(V·(V+E)) time.`
      : `One walk per course: ${checked} courses checked, for only ${graph.count} courses. With V courses and E arrows, this can cost O(V·(V+E)) time.`,
    state: plain(graph, { counter: { label: "courses checked", value: checked } }),
  });
  return { frames, checked };
}

function insightFrames(graph: Graph): CourseFrame[] {
  const counts = blockers(graph);
  const free = counts.flatMap((value, course) => (value === 0 ? [course] : []));
  const first = graph.edges[0];
  const frames: CourseFrame[] = [
    {
      scene: "insight",
      caption: first
        ? `Picture a chain of dominoes. Each course is a domino. The arrow means: domino ${first[0]} must fall before domino ${first[1]} can.`
        : "Picture dominoes. Each course is a domino, and a domino falls when its course is taken.",
      state: plain(graph),
    },
    {
      scene: "insight",
      caption:
        free.length > 0
          ? `Write on every domino how many others still block it. A domino blocked by 0 is free: it can fall now. Here that is ${free.length === 1 ? "domino" : "dominoes"} ${list(free)}.`
          : "Write on every domino how many others still block it. A domino blocked by 0 is free. Here not one domino is free.",
      state: plain(graph, { blockedBy: counts, free }),
    },
  ];
  if (free.length > 0) {
    const falls = free[0];
    const after = [...counts];
    for (const next of graph.unlocks[falls]) after[next]--;
    const freed = graph.unlocks[falls].filter((next) => after[next] === 0);
    frames.push({
      scene: "insight",
      caption:
        graph.unlocks[falls].length === 0
          ? `Domino ${falls} falls. No arrow leaves it, so no other domino changes.`
          : `When domino ${falls} falls, every domino it points to loses one blocker.${freed.length > 0 ? ` That sets ${freed.length === 1 ? "domino" : "dominoes"} ${list(freed)} free.` : " Here they all stay blocked for now."}`,
      state: plain(graph, { blockedBy: after, fallen: [falls], active: falls, free: [...free.slice(1), ...freed] }),
    });
  }
  const done = finishable(graph);
  const standing = graph.count - done.size;
  frames.push({
    scene: "insight",
    caption:
      standing === 0
        ? "Keep letting free dominoes fall. Here every domino falls in the end, so every course can be finished."
        : `Keep letting free dominoes fall. Here ${dominoes(standing)} can never become free, so not every course can be finished.`,
    state: plain(graph, {
      blockedBy: counts.map((_, course) => (done.has(course) ? 0 : graph.needs[course].filter((before) => !done.has(before)).length)),
      fallen: [...done],
      free: [],
    }),
  });
  return frames;
}

function firstFreeQuiz(graph: Graph, counts: number[], answer: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  counts.forEach((value, course) => {
    if (course !== answer) feedback[course] = `Course ${course} is blocked by ${value}. It has to wait.`;
  });
  return {
    kind: "cell",
    cells: graph.count,
    numbered: true,
    question: "Which domino can fall first? Click it.",
    answer,
    feedback,
    otherwise: "Look for the domino that nothing blocks.",
    why: "No arrow points into it, so it is blocked by 0. It is free from the start.",
  };
}

function freedQuiz(graph: Graph, counts: number[], falling: number, fallen: number[], free: number[], answer: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let course = 0; course < graph.count; course++) {
    if (course === answer) continue;
    feedback[course] =
      course === falling
        ? "That is the domino falling right now."
        : fallen.includes(course)
          ? "That domino fell earlier."
          : free.includes(course)
            ? "That one is free already. It is waiting in the free line."
            : graph.unlocks[falling].includes(course)
              ? `Course ${course} is blocked by ${counts[course]}. Losing one blocker still leaves ${counts[course] - 1}.`
              : `No arrow runs from course ${falling} to that one, so nothing changes for it.`;
  }
  return {
    kind: "cell",
    cells: graph.count,
    numbered: true,
    question: `Domino ${falling} falls. Which course becomes free because of it? Click it.`,
    answer,
    feedback,
    otherwise: "Follow the arrows that leave the falling domino.",
    why: "An arrow runs to it from the falling domino, and that was its last blocker.",
  };
}

const WHY_STUCK: StoryQuiz = {
  kind: "choice",
  question: "Nothing is free, yet dominoes are still standing. Why?",
  options: ["They block each other in a circle", "The free line lost a course by mistake", "They become free after one more round"],
  answer: 0,
  why: "Follow the arrows between them: they lead round in a circle. Each one waits for another, so none can go first.",
};

/** Among courses that never fell, follow "waits for" until a course repeats: that is the circle. */
function findCircle(graph: Graph, fallen: number[]): number[] {
  const standing = (course: number) => !fallen.includes(course);
  let course = Array.from({ length: graph.count }, (_, index) => index).find(standing);
  const seen: number[] = [];
  while (course !== undefined && !seen.includes(course)) {
    seen.push(course);
    course = graph.needs[course].find(standing);
  }
  return course === undefined ? [] : seen.slice(seen.indexOf(course));
}

function circleText(circle: number[]): string {
  if (circle.length === 1) return `course ${circle[0]} waits for itself`;
  if (circle.length > 3) return `${circle.length} courses wait for each other in a circle`;
  const parts = circle.map((course, index) => `${course} waits for ${circle[(index + 1) % circle.length]}`);
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on fresh courses:
 * fewer frames, and the reader makes every call.
 */
function solutionFrames(graph: Graph, slowChecked: number, scene: SceneId = "solution", practice = false): CourseFrame[] {
  const frames: CourseFrame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const counts = blockers(graph);
  const free: number[] = [];
  const fallen: number[] = [];
  let steps = 0;
  let askedFreed = false;
  const snap = (extra: Partial<CourseGraphState> = {}): CourseGraphState => plain(graph, { blockedBy: [...counts], fallen: [...fallen], free: [...free], ...extra });
  const last = () => frames[frames.length - 1];

  const starters = counts.flatMap((value, course) => (value === 0 ? [course] : []));
  frames.push({
    scene,
    caption: practice
      ? "Your turn, on new courses. You decide which domino falls, and which one it sets free."
      : "First count the blockers. Every arrow pointing into a domino is one blocker, and the number is written on the domino.",
    codeLine: line(LINE.count),
    state: snap({ free: null }),
    quiz: starters.length === 1 ? firstFreeQuiz(graph, counts, starters[0]) : undefined,
  });
  free.push(...starters);
  if (!practice || starters.length !== 1) {
    frames.push({
      scene,
      caption:
        starters.length === 0
          ? "Not one domino is blocked by 0. The free line starts empty."
          : `${starters.length === 1 ? `Domino ${starters[0]} is` : `Dominoes ${list(starters)} are`} blocked by 0, so ${starters.length === 1 ? "it is" : "they are"} free. Free dominoes wait in the free line.`,
      codeLine: line(LINE.firstFree),
      state: snap(),
    });
  }

  while (free.length > 0) {
    const course = free.shift()!;
    fallen.push(course);
    steps++;
    const next = graph.unlocks[course];
    const freed = next.filter((other) => counts[other] === 1);
    frames.push({
      scene,
      caption: `${practice ? `Domino ${course} is free, so it falls.` : `Domino ${course} is first in the free line. It falls.`}${next.length === 0 ? " No arrow leaves it, so no other domino changes." : ""}`,
      codeLine: line(LINE.fall),
      state: snap({ active: course }),
      quiz: freed.length === 1 && (practice || !askedFreed) ? freedQuiz(graph, counts, course, fallen.slice(0, -1), free, freed[0]) : undefined,
    });
    if (freed.length === 1) askedFreed = true;

    if (practice) {
      if (next.length === 0) continue;
      const told = next.map((other) => {
        counts[other]--;
        steps++;
        if (counts[other] === 0) free.push(other);
        return counts[other] === 0 ? `Course ${other} drops to blocked by 0: it is free.` : `Course ${other} drops to blocked by ${counts[other]} and stays standing.`;
      });
      frames.push({
        scene,
        caption: told.length <= 3 ? told.join(" ") : `${told.length} dominoes lose a blocker.${freed.length > 0 ? ` That sets ${freed.length === 1 ? "domino" : "dominoes"} ${list(freed)} free.` : " None of them is free yet."}`,
        state: snap({ active: course }),
      });
      continue;
    }

    for (const other of next) {
      counts[other]--;
      steps++;
      frames.push({
        scene,
        caption: `An arrow runs from ${course} to ${other}, so domino ${other} loses a blocker. Now it is blocked by ${counts[other]}${counts[other] > 0 ? " and stays standing." : "."}`,
        codeLine: LINE.lose,
        state: snap({ active: course, touched: other }),
      });
      if (counts[other] === 0) {
        free.push(other);
        frames.push({ scene, caption: `Blocked by 0 means free. Domino ${other} joins the end of the free line.`, codeLine: LINE.join, state: snap({ active: course, touched: other }) });
      }
    }
  }

  const standing = graph.count - fallen.length;
  if (standing > 0) {
    if (practice && !last().quiz) last().quiz = WHY_STUCK;
    else {
      frames.push({
        scene,
        caption: `The free line is empty, but ${dominoes(standing)} still ${standing === 1 ? "stands" : "stand"}. Every one of them is still blocked.`,
        codeLine: line(LINE.loop),
        state: snap(),
        quiz: WHY_STUCK,
      });
    }
    const circle = findCircle(graph, fallen);
    frames.push({
      scene,
      caption: `The Cycle Deadlock Trap: ${circleText(circle)}. None of them can ever fall first, so the free line stays empty for good.`,
      codeLine: line(LINE.loop),
      state: snap({ stuck: circle }),
    });
    frames.push({
      scene,
      caption: `Only ${fallen.length} of ${dominoes(graph.count)} fell, so not every course can be finished. The answer is false.${practice ? " You made every call yourself." : ""}`,
      codeLine: line(LINE.answer),
      state: snap({ stuck: circle }),
    });
  } else {
    frames.push({
      scene,
      caption: `The free line is empty and all ${dominoes(graph.count)} fell. Every course can be finished. The answer is true.${practice ? " You made every call yourself." : ""}`,
      codeLine: line(LINE.answer),
      state: snap(),
    });
  }

  if (!practice) {
    const stuck = standing > 0 ? findCircle(graph, fallen) : [];
    frames.push({
      scene,
      caption: `Time: O(V+E), for V courses and E arrows. Each domino falls at most once, and each arrow takes away one blocker at most once: ${steps} steps${slowChecked > steps ? `, not ${slowChecked}` : ""}.`,
      codeLine: LINE.arrows,
      state: snap({ stuck, counter: { label: "falls + arrows used", value: steps } }),
    });
    frames.push({
      scene,
      caption: "Space: O(V+E). We keep one blocker count per domino, one list entry per arrow, and the free line.",
      codeLine: LINE.counts,
      state: snap({ stuck }),
    });
  }
  return frames;
}

export const courseScheduleStory: ProblemStory<CourseGraphState> = {
  slugs: ["lc-207"],
  pattern: "Topological order: keep taking what nothing blocks",
  trigger: "tasks or courses with “this one must come before that one”, and the question “can they all be done?”",
  insight: "Dominoes. Write on each course how many others still block it. Whatever is blocked by 0 falls, and each fall takes one blocker off the courses it points to. If some never fall, there is a circle.",
  metaphor: {
    name: "The domino chain",
    legend: "blocked by N = blockedBy[course] · free line = the queue `free` · a domino falls = free.poll() · arrows leaving it = unlocks.get(course)",
    terms: ["domino", "falls", "fell", "free", "blocked", "blocker", "standing"],
  },
  traps: [
    {
      name: "The Cycle Deadlock Trap",
      rule: "Courses that wait for each other in a circle are never blocked by 0, so they never enter the free line. Do not loop for ever waiting for them: count the falls and compare with numCourses.",
    },
  ],
  template: [
    "count, for every node, how many arrows point into it;",
    "queue = every node with count 0;",
    "while (queue not empty) {",
    "    node = queue.poll(); done++;",
    "    for each arrow node -> next:",
    "        if (--count[next] == 0) queue.add(next);",
    "}",
    "return done == number of nodes;      // fewer means a circle",
  ],
  complexity: {
    slow: "O(V·(V+E))",
    time: "O(V+E)",
    timeWhy: "each domino falls at most once, and each arrow takes away one blocker at most once",
    space: "O(V+E)",
    spaceWhy: "one blocker count per course, one list entry per arrow, plus the free line",
  },
  code: CODE,
  examples: [
    { label: "5 courses, a branching chain", input: "numCourses=5, prereq=[[1,0],[2,0],[3,1],[3,2],[4,3]]", expected: "true" },
    { label: "4 courses, a hidden circle", input: "numCourses=4, prereq=[[1,0],[2,1],[3,2],[1,3]]", expected: "false", note: "Courses 1, 2 and 3 wait for each other" },
    { label: "2 courses, each needs the other", input: "numCourses=2, prereq=[[1,0],[0,1]]", expected: "false" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-210", title: "Course Schedule II" },
    { slug: "lc-269", title: "Alien Dictionary" },
  ],
  answer: (input) => {
    const graph = parse(input);
    return String(finishable(graph).size === graph.count);
  },
  frames: (input) => {
    const graph = parse(input);
    const slow = slowFrames(graph);
    const insight = insightFrames(graph);
    const done = finishable(graph);
    const fallen = [...done];
    // The picture to keep: the first domino falling and setting others free, or, if nothing is ever free, the circle.
    const remember: CourseGraphState =
      insight.length === 4
        ? insight[2].state
        : plain(graph, { blockedBy: graph.needs.map((before) => before.filter((course) => !done.has(course)).length), fallen, free: [], stuck: findCircle(graph, fallen) });
    return [
      ...pictureFrames(graph),
      ...slow.frames,
      ...insight,
      ...solutionFrames(graph, slow.checked),
      ...solutionFrames(parse(PRACTICE), 0, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: remember,
      },
    ];
  },
  View: CourseGraphView,
};
