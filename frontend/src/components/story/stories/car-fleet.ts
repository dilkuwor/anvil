import type { CellTone } from "@/components/learn/viz/primitives";

import { CarFleetView, type CarFleetState, type RoadCar } from "../rec03-car-fleet-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<CarFleetState>;
type Car = { id: number; pos: number; speed: number; time: number };
type Road = { target: number; cars: Car[] };

/** Fresh road for the "your turn" run. The third car back is the stuck-car moment. */
const PRACTICE = "20 | 16,12,4,2 | 1,8,5,1";

const CODE = [
  "Arrays.sort(order, (a, b) -> Integer.compare(position[b], position[a]));",
  "Deque<Double> fleets = new ArrayDeque<>();",
  "for (int car : order) {",
  "    double arrival = (double) (target - position[car]) / speed[car];",
  "    if (fleets.isEmpty() || arrival > fleets.peekFirst()) {",
  "        fleets.addFirst(arrival);",
  "    }",
  "}",
  "return fleets.size();",
];

const numbers = (raw: string) =>
  raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(Number);

function parse(input: string): Road {
  const [targetText, positionText, speedText] = input.split("|");
  const target = Number(targetText) || 10;
  const positions = numbers(positionText ?? "");
  const speeds = numbers(speedText ?? "");
  const cars = positions.map((pos, id) => {
    const speed = speeds[id] || 1;
    return { id, pos, speed, time: (target - pos) / speed };
  });
  return { target, cars };
}

/** Arrival times read as plain numbers: 7, 1.6, 0.33. */
const fmt = (value: number) => (Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2))));
const nearestFirst = (cars: Car[]) => [...cars].sort((a, b) => b.pos - a.pos);

/** Independent solver: a car leads a fleet exactly when it arrives later than every car in front of it. */
function countFleets({ cars }: Road): number {
  return cars.filter((car) => cars.every((other) => other.pos <= car.pos || other.time < car.time)).length;
}

type Kind = "lead" | "new" | "join";
type Step = { car: Car; ahead: Car | null; top: number | null; kind: Kind; stuck: boolean };

/** The real algorithm, from the finish backwards, recorded one car at a time. */
function walk(road: Road): Step[] {
  const stack: number[] = [];
  const steps: Step[] = [];
  let ahead: Car | null = null;
  for (const car of nearestFirst(road.cars)) {
    const top = stack.length > 0 ? stack[stack.length - 1] : null;
    const kind: Kind = top === null ? "lead" : car.time > top ? "new" : "join";
    // The trap: the car just ahead, on its own, would arrive sooner than this car, but it is stuck in a slower fleet.
    const stuck = kind === "join" && ahead !== null && ahead.time < car.time;
    steps.push({ car, ahead, top, kind, stuck });
    if (kind !== "join") stack.push(car.time);
    ahead = car;
  }
  return steps;
}

type Draw = {
  tone?: (car: Car) => CellTone | null;
  times?: Set<number> | "all";
  fleets?: number[][];
  stack?: { label: string; tone: CellTone }[] | null;
  link?: CarFleetState["link"];
  wrongLink?: CarFleetState["wrongLink"];
  counter?: CarFleetState["counter"];
};

function draw(road: Road, d: Draw = {}): CarFleetState {
  const cars: RoadCar[] = road.cars.map((car) => ({
    id: car.id,
    pos: car.pos,
    speed: car.speed,
    tone: d.tone?.(car) ?? "idle",
    time: d.times === "all" || d.times?.has(car.id) ? fmt(car.time) : null,
  }));
  return { target: road.target, cars, fleets: d.fleets ?? [], stack: d.stack === undefined ? null : d.stack, link: d.link ?? null, wrongLink: d.wrongLink ?? null, counter: d.counter ?? null };
}

/** Fleets and stack after the first `upTo` steps. */
function progress(steps: Step[], upTo: number) {
  const fleets: number[][] = [];
  const stack: number[] = [];
  for (const step of steps.slice(0, upTo)) {
    if (step.kind === "join") fleets[fleets.length - 1].push(step.car.id);
    else {
      fleets.push([step.car.id]);
      stack.push(step.car.time);
    }
  }
  return { fleets, stack };
}

function pictureFrames(road: Road): F[] {
  const steps = walk(road);
  const all = progress(steps, steps.length);
  const frames: F[] = [
    { scene: "picture", caption: `Cars drive on a one-lane road towards the finish at mile ${road.target}. The number in each car is its speed.`, state: draw(road) },
  ];
  const join = steps.find((step) => step.kind === "join");
  if (join?.ahead) {
    const { car, ahead } = join;
    frames.push({
      scene: "picture",
      caption: `A car cannot pass. The car at mile ${car.pos} catches up with the car at mile ${ahead.pos}, and from then on they drive together. That group is a fleet.`,
      state: draw(road, { tone: (other) => (other === car || other === ahead ? "hit" : null), link: { from: car.id, to: ahead.id }, fleets: [[car.id, ahead.id]] }),
    });
  }
  const alone = road.cars.find((car) => all.fleets.some((ids) => ids.length === 1 && ids[0] === car.id));
  if (alone) {
    frames.push({
      scene: "picture",
      caption: `A car that never catches anyone, like the one at mile ${alone.pos}, is a fleet on its own.`,
      state: draw(road, { tone: (other) => (other === alone ? "hit" : null), fleets: [[alone.id]] }),
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: count the fleets that cross the finish. Here that is ${all.fleets.length}.`,
    state: draw(road, { tone: () => "hit", fleets: all.fleets }),
  });
  return frames;
}

/** The obvious way, really run: every car looks at every car to find the latest arrival in front of it. */
function slowFrames(road: Road): F[] {
  const frames: F[] = [
    { scene: "slow", caption: "The slow way starts by working out when each car would arrive on an empty road: miles left, divided by speed.", state: draw(road, { times: "all" }) },
  ];
  let looks = 0;
  road.cars.forEach((car, index) => {
    let latest: number | null = null;
    let slowest: Car | null = null;
    for (const other of road.cars) {
      looks++;
      if (other.pos > car.pos && (latest === null || other.time > latest)) {
        latest = other.time;
        slowest = other;
      }
    }
    if (index > 2) return;
    const leads = latest === null || car.time > latest;
    frames.push({
      scene: "slow",
      caption:
        latest === null
          ? `The car at mile ${car.pos} looks at every car, and finds nobody in front. It leads a fleet.`
          : `The car at mile ${car.pos} looks at every car. The latest arrival in front is ${fmt(latest)}, so it ${leads ? "never catches up and leads a fleet" : "gets stuck and joins a fleet"}.`,
      state: draw(road, {
        times: "all",
        tone: (other) => (other === car ? "edge" : other === slowest ? (leads ? "window" : "miss") : other.pos > car.pos ? "window" : null),
        counter: { label: "looks", value: looks },
      }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `This is O(n²) time: every car looks at every other car. That was ${looks} looks for ${road.cars.length} cars.`,
    state: draw(road, { times: "all", tone: () => "faded", counter: { label: "looks", value: looks } }),
  });
  return frames;
}

function insightFrames(road: Road): F[] {
  const steps = walk(road);
  const [first, second] = steps;
  const frames: F[] = [
    {
      scene: "insight",
      caption: `Now go from the finish backwards. The car nearest the finish, at mile ${first.car.pos}, is never blocked. It leads the first fleet.`,
      state: draw(road, { times: new Set([first.car.id]), tone: (car) => (car === first.car ? "done" : null), fleets: [[first.car.id]] }),
    },
  ];
  if (second) {
    const joins = second.kind === "join";
    frames.push({
      scene: "insight",
      caption: `The next car back would arrive at ${fmt(second.car.time)}, and the fleet in front at ${fmt(first.car.time)}. ${joins ? "It is not later, so it catches up and joins." : "It is later, so it never catches up. A new fleet starts."}`,
      state: draw(road, {
        times: new Set([first.car.id, second.car.id]),
        tone: (car) => (car === first.car ? "done" : car === second.car ? (joins ? "hit" : "done") : null),
        fleets: progress(steps, 2).fleets,
        link: joins ? { from: second.car.id, to: first.car.id } : null,
      }),
    });
  }
  const after = progress(steps, Math.min(2, steps.length));
  frames.push({
    scene: "insight",
    caption: "So each car only needs the arrival time of the fleet just in front. Keep the fleet times on a stack: a new fleet goes on top.",
    state: draw(road, {
      times: new Set(steps.slice(0, 2).map((step) => step.car.id)),
      tone: (car) => (steps.slice(0, 2).some((step) => step.car === car) ? "hit" : null),
      fleets: after.fleets,
      stack: after.stack.map((time, index) => ({ label: fmt(time), tone: index === after.stack.length - 1 ? "edge" : "idle" })),
    }),
  });
  return frames;
}

function decideQuiz(step: Step): StoryQuiz {
  const top = fmt(step.top ?? 0);
  const time = fmt(step.car.time);
  const question = `This car would arrive at ${time}. The fleet in front arrives at ${top}. What does the car do?`;
  if (step.kind === "join") {
    return {
      kind: "choice",
      question,
      options: ["It catches up and joins that fleet", "It starts a new fleet of its own"],
      answer: 0,
      why: step.stuck
        ? `${time} is not later than ${top}. The car just ahead is faster, but it is stuck in that fleet, so this car catches the fleet.`
        : `${time} is not later than ${top}, so it reaches the fleet before the finish and has to slow down.`,
    };
  }
  return {
    kind: "choice",
    question,
    options: ["It catches up and joins that fleet", "It starts a new fleet of its own"],
    answer: 1,
    why: `${time} is later than ${top}. The fleet in front is over the finish before this car can reach it.`,
  };
}

/** The real algorithm, one frame per change. `practice` reuses it: the reader decides for every car. */
function solutionFrames(road: Road, scene: SceneId = "solution", practice = false): F[] {
  const steps = walk(road);
  const frames: F[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const asked = new Set<Kind>();
  let warned = false;
  const seen = new Set<number>();

  const stateAt = (done: number, current: Step | null, extra: Draw = {}): CarFleetState => {
    const { fleets, stack } = progress(steps, done);
    const leaders = new Set(fleets.map((ids) => ids[0]));
    return draw(road, {
      times: new Set(seen),
      tone: (car) => (current && car === current.car ? "edge" : leaders.has(car.id) ? "done" : seen.has(car.id) ? "hit" : null),
      fleets,
      stack: stack.map((time, index) => ({ label: fmt(time), tone: index === stack.length - 1 ? "edge" : "idle" })),
      ...extra,
    });
  };

  if (practice) {
    frames.push({ scene, caption: `Your turn, on a new road to mile ${road.target}. The cars are taken from the finish backwards, and you decide what each car does.`, state: stateAt(0, null) });
  } else {
    frames.push({ scene, caption: "Sort the cars by position, so the car nearest the finish comes first on the road.", codeLine: 0, state: draw(road) });
    frames.push({ scene, caption: "Start with an empty stack of fleet arrival times.", codeLine: 1, state: stateAt(0, null) });
  }

  steps.forEach((step, index) => {
    const { car } = step;
    seen.add(car.id);
    const ask = step.kind !== "lead" && (practice || !asked.has(step.kind));
    if (ask) asked.add(step.kind);
    frames.push({
      scene,
      caption: practice
        ? `${index === 0 ? "The car nearest the finish" : "The next car back"}, at mile ${car.pos}, would arrive at ${fmt(car.time)}.${step.top === null ? " The stack is empty." : ""}`
        : `Next car back on the road: mile ${car.pos}, speed ${car.speed}. On its own it would arrive at ${fmt(car.time)}.`,
      codeLine: line(3),
      state: stateAt(index, step),
      quiz: ask ? decideQuiz(step) : undefined,
    });
    const after = stateAt(index + 1, null);
    if (step.kind === "lead") {
      frames.push({ scene, caption: `The stack is empty, so nothing is in front. This car leads a new fleet, and ${fmt(car.time)} goes on the stack.`, codeLine: line(5), state: after });
    } else if (step.kind === "new") {
      frames.push({
        scene,
        caption: `${fmt(car.time)} is later than ${fmt(step.top ?? 0)}, so this car never catches the fleet in front. A new fleet starts, and ${fmt(car.time)} goes on top.`,
        codeLine: line(5),
        state: after,
      });
    } else {
      const leader = progress(steps, index + 1).fleets.at(-1)?.[0] ?? car.id;
      frames.push({
        scene,
        caption:
          practice && step.stuck
            ? `${fmt(car.time)} is not later than ${fmt(step.top ?? 0)}. The car just ahead is faster, but it is stuck in that fleet, so this car joins it too.`
            : `${fmt(car.time)} is not later than ${fmt(step.top ?? 0)}. The car catches the fleet in front on the road and joins it. The stack stays.`,
        codeLine: line(4),
        state: { ...after, link: { from: car.id, to: leader } },
      });
      if (step.stuck && step.ahead && !warned && !practice) {
        warned = true;
        frames.push({
          scene,
          caption: `The Stuck Car Trap: the car just ahead would arrive at ${fmt(step.ahead.time)} on its own, but it is stuck in a fleet that arrives at ${fmt(step.top ?? 0)}. Compare with the top.`,
          codeLine: 4,
          state: { ...stateAt(index + 1, null), wrongLink: { from: car.id, to: step.ahead.id, label: `✕ its own time ${fmt(step.ahead.time)}` } },
        });
      }
    }
  });

  const count = progress(steps, steps.length).stack.length;
  frames.push({
    scene,
    caption: practice ? `Done. The stack holds ${count} fleet time${count === 1 ? "" : "s"}, so the answer is ${count}.` : `Every car is placed. The stack holds ${count} fleet time${count === 1 ? "" : "s"}, so the answer is ${count}.`,
    codeLine: line(8),
    state: stateAt(steps.length, null),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log n). Sorting the cars is the big cost. After it, each car on the road was looked at once: ${steps.length} looks.`,
      codeLine: 0,
      state: { ...stateAt(steps.length, null), counter: { label: "looks", value: steps.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(n). The sorted order holds every car, and the stack could too, if no car ever caught a fleet.",
      codeLine: 1,
      state: stateAt(steps.length, null),
    });
  }
  return frames;
}

export const carFleetStory: ProblemStory<CarFleetState> = {
  slugs: ["lc-853"],
  pattern: "Monotonic stack",
  trigger: "cars on one road that cannot pass each other, and the question “how many groups reach the end?”",
  insight: "Look at the cars from the finish backwards and work out when each would arrive. A car that would arrive no later than the fleet in front is stuck behind it and joins it. Only a later arrival starts a new fleet.",
  metaphor: { name: "The one-lane road", legend: "fleet times = the stack · top = peekFirst() · a new fleet = addFirst()", terms: ["fleet", "road", "car"] },
  traps: [{ name: "The Stuck Car Trap", rule: "A car that joined a fleet no longer arrives at its own time. Compare with the fleet's arrival time on top of the stack, not with the car just ahead." }],
  template: [
    "sort the items so the one that decides comes first;",
    "for (each item) {",
    "    compare it with the top of the stack;",
    "    if (it starts something new) put it on the stack;   // here: a later arrival",
    "}",
    "answer from the stack;   // here: its size",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n log n)",
    timeWhy: "sorting the cars is the big cost; after it each car is looked at once",
    space: "O(n)",
    spaceWhy: "the sorted order, and a stack that holds at most one time per car",
  },
  code: CODE,
  examples: [
    { label: "target 12, cars at [10,8,0,5,3], speeds [2,4,1,1,3]", input: "12 | 10,8,0,5,3 | 2,4,1,1,3", expected: "3" },
    { label: "target 10, cars at [8,6,2], speeds [1,4,5]", input: "10 | 8,6,2 | 1,4,5", expected: "1", note: "Tricky: a fast car stuck behind a slow one" },
    { label: "target 10, cars at [0,5], speeds [2,1]", input: "10 | 0,5 | 2,1", expected: "1", note: "They meet exactly at the finish" },
    { label: "target 10, cars at [6,8], speeds [3,2]", input: "10 | 6,8 | 3,2", expected: "2" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-739", title: "Daily Temperatures" },
    { slug: "lc-84", title: "Largest Rectangle in Histogram" },
    { slug: "lc-56", title: "Merge Intervals" },
  ],
  answer: (input) => String(countFleets(parse(input))),
  frames: (input) => {
    const road = parse(input);
    const steps = walk(road);
    const all = progress(steps, steps.length);
    const leaders = new Set(all.fleets.map((ids) => ids[0]));
    return [
      ...pictureFrames(road),
      ...slowFrames(road),
      ...insightFrames(road),
      ...solutionFrames(road),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(road, {
          times: "all",
          tone: (car) => (leaders.has(car.id) ? "done" : "hit"),
          fleets: all.fleets,
          stack: all.stack.map((time, index) => ({ label: fmt(time), tone: index === all.stack.length - 1 ? "edge" : "idle" })),
        }),
      },
    ];
  },
  View: CarFleetView,
};
