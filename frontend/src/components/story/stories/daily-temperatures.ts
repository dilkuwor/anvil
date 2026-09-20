import type { CellTone } from "@/components/learn/viz/primitives";

import { WaitingRoomView, type WaitingRoomState } from "../monotonic-stack-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type F = StoryFrame<WaitingRoomState>;

/** Fresh input for the "your turn" run. Day 2 is exactly as warm as day 1, so it reaches the trap. */
const PRACTICE = "72,70,70,71,75";

const CODE = [
  "int n = temperatures.length, prev;",
  "int[] answer = new int[n];",
  "Deque<Integer> waiting = new ArrayDeque<>(); // day numbers, not temperatures",
  "for (int i = 0; i < n; i++) {",
  "    while (!waiting.isEmpty() && temperatures[i] > temperatures[waiting.peekLast()]) {",
  "        prev = waiting.pollLast();",
  "        answer[prev] = i - prev;",
  "    }",
  "    waiting.addLast(i);",
  "}",
  "return answer;",
];

function parse(input: string): number[] {
  return input
    .replace(/[[\]\s]/g, "")
    .split(",")
    .filter((part) => part !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value));
}

/** Independent solver: looks ahead from each day. Slow, but obviously right. */
function solve(temps: number[]): number[] {
  return temps.map((temp, day) => {
    const warmer = temps.findIndex((later, index) => index > day && later > temp);
    return warmer === -1 ? 0 : warmer - day;
  });
}

const days = (count: number) => `${count} day${count === 1 ? "" : "s"}`;
const looks = (count: number) => `${count} look${count === 1 ? "" : "s"}`;

function nameDays(list: number[]): string {
  const names = list.map((day) => `day ${day}`);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank(temps: number[]): WaitingRoomState {
  return { temps, tones: tones(temps.length, () => null), today: null, waiting: [], answers: temps.map(() => null) };
}

function pictureFrames(temps: number[]): F[] {
  const n = temps.length;
  const answer = solve(temps);
  const frames: F[] = [{ scene: "picture", caption: `These are the temperatures of ${days(n)} in a row. Each bar is one day, and a taller bar is a warmer day.`, state: blank(temps) }];
  const longest = answer.indexOf(Math.max(...answer));
  if (answer[longest] > 0) {
    const warmer = longest + answer[longest];
    frames.push({
      scene: "picture",
      caption: `For each day we ask: how many days until a warmer one? After day ${longest} (${temps[longest]}°), the first warmer day is day ${warmer} (${temps[warmer]}°). So its wait is ${answer[longest]}.`,
      state: {
        ...blank(temps),
        tones: tones(n, (index) => (index === longest ? "edge" : index === warmer ? "done" : index > longest && index < warmer ? "faded" : null)),
        answers: temps.map((_, index) => (index === longest ? answer[longest] : null)),
        link: { from: longest, to: warmer, tone: "wait", label: `waited ${days(answer[longest])}` },
      },
    });
  }
  const never = answer.findIndex((wait) => wait === 0);
  frames.push({
    scene: "picture",
    caption: never === n - 1 ? `Day ${never} is the last day. No day comes after it, so its wait is written as 0.` : `No day after day ${never} (${temps[never]}°) is warmer. A day like that gets 0.`,
    state: { ...blank(temps), tones: tones(n, (index) => (index === never ? "edge" : index > never ? "faded" : null)), answers: temps.map((_, index) => (index === never ? 0 : null)) },
  });
  frames.push({ scene: "picture", caption: "The goal: fill in the wait for every day.", state: { ...blank(temps), tones: tones(n, () => "hit"), answers: answer } });
  return frames;
}

/** The obvious way, really run: from each day, look at later days one by one. */
function slowFrames(temps: number[]): F[] {
  const n = temps.length;
  const frames: F[] = [];
  const answers: (number | null)[] = temps.map(() => null);
  let count = 0;
  for (let day = 0; day < n; day++) {
    let found = -1;
    let here = 0;
    for (let later = day + 1; later < n; later++) {
      count++;
      here++;
      if (temps[later] > temps[day]) {
        found = later;
        break;
      }
    }
    answers[day] = found === -1 ? 0 : found - day;
    if (day > 2 || day === n - 1) continue;
    const end = found === -1 ? n - 1 : found;
    const outcome = found === -1 ? `None is warmer, after ${looks(here)}.` : `Day ${found} is warmer, after ${looks(here)}.`;
    frames.push({
      scene: "slow",
      caption: day === 0 ? `The slow way: stand on day 0 (${temps[0]}°) and look at each later day until one is warmer. ${outcome}` : `Now stand on day ${day} (${temps[day]}°) and look along the later days again. ${outcome}`,
      state: {
        ...blank(temps),
        today: day,
        tones: tones(n, (index) => (index === day ? "edge" : index === found ? "done" : index > day && index <= end ? "window" : null)),
        answers: [...answers],
        counter: { label: "looks", value: count },
      },
    });
  }
  frames.push({
    scene: "slow",
    caption: `Doing that from every day took ${looks(count)} for ${days(n)}. This is O(n²) time: in a long cold spell, every day looks at almost every later day.`,
    state: { ...blank(temps), tones: tones(n, () => "faded"), answers: [...answers], counter: { label: "looks", value: count } },
  });
  return frames;
}

type Moment = { day: number; room: number[]; leave: number[] };

/** The first arrival that lets somebody out, preferring one where several days are waiting. */
function firstWarmArrival(temps: number[]): Moment | null {
  const waiting: number[] = [];
  let fallback: Moment | null = null;
  for (let day = 0; day < temps.length; day++) {
    const room = [...waiting];
    const leave: number[] = [];
    while (waiting.length > 0 && temps[day] > temps[waiting[waiting.length - 1]]) leave.push(waiting.pop()!);
    if (leave.length > 0) {
      if (room.length > 1) return { day, room, leave };
      fallback ??= { day, room, leave };
    }
    waiting.push(day);
  }
  return fallback;
}

function insightFrames(temps: number[]): F[] {
  const n = temps.length;
  const moment = firstWarmArrival(temps);
  if (!moment) {
    return [{ scene: "insight", caption: "Picture a waiting room. Every day walks in and waits for a warmer day. Here no warmer day ever comes, so everyone keeps waiting.", state: { ...blank(temps), waiting: temps.map((_, index) => index), tones: tones(n, () => "window") } }];
  }
  const { day, room, leave } = moment;
  const stay = room.filter((other) => !leave.includes(other));
  const answers = temps.map((_, index) => (leave.includes(index) ? day - index : null));
  const waitingTones = (list: number[]) => (index: number) => (list.includes(index) ? ("window" as const) : null);
  const door = room[room.length - 1];
  return [
    {
      scene: "insight",
      caption: `Picture a waiting room. Every day walks in and waits there for a warmer day. Right now ${nameDays(room)} ${room.length > 1 ? "are" : "is"} waiting.`,
      state: { ...blank(temps), waiting: room, tones: tones(n, waitingTones(room)) },
    },
    {
      scene: "insight",
      caption: `The last one in sits nearest the door: day ${door}. Nobody deeper in the room is colder than it, so a new day only needs to look at the door.`,
      state: { ...blank(temps), waiting: room, tones: tones(n, (index) => (index === door ? "edge" : waitingTones(room)(index))) },
    },
    {
      scene: "insight",
      caption: `Day ${day} arrives with ${temps[day]}°. It is warmer than ${nameDays(leave)}, so ${leave.length > 1 ? "they leave with their answers" : "that day leaves with its answer"}.${stay.length > 0 ? ` Day ${stay[stay.length - 1]} (${temps[stay[stay.length - 1]]}°) keeps waiting.` : ""}`,
      state: { ...blank(temps), today: day, waiting: stay, answers, tones: tones(n, (index) => (index === day ? "edge" : leave.includes(index) ? "done" : waitingTones(stay)(index))) },
    },
  ];
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on fresh temperatures:
 * every arrival is a question, and so is every "who leaves next?".
 */
function solutionFrames(temps: number[], scene: SceneId = "solution", practice = false): F[] {
  const n = temps.length;
  const frames: F[] = [];
  const waiting: number[] = [];
  const answers: (number | null)[] = temps.map(() => null);
  let compared = 0;
  let fullest: number[] = [];
  const asked = { first: false, next: false, equal: false };
  // In the story, the first "who leaves?" question waits for a moment with several days in the room.
  const showcase = firstWarmArrival(temps)?.day ?? -1;
  const line = (index: number) => (practice ? undefined : index);
  const door = () => waiting[waiting.length - 1];

  const paint = (today: number | null, special: (index: number) => CellTone | null = () => null) =>
    tones(n, (index) => special(index) ?? (index === today ? "edge" : waiting.includes(index) ? "window" : answers[index] !== null ? "hit" : null));
  const base = (today: number | null): WaitingRoomState => ({ temps, tones: paint(today), today, waiting: [...waiting], answers: [...answers] });

  /** Asked before anybody moves. `answer` is a day, or `n` for "nobody". */
  const leaveQuiz = (today: number, answer: number, question: string): StoryQuiz => {
    const feedback: Record<number, string> = {};
    for (let index = 0; index < n; index++) {
      if (index === answer) continue;
      if (index === today) feedback[index] = `Day ${index} is the one that just arrived. It lets others out. It does not leave.`;
      else if (index > today) feedback[index] = `Day ${index} has not arrived yet.`;
      else if (!waiting.includes(index)) feedback[index] = `Day ${index} already left the waiting room with its answer.`;
      else if (temps[today] === temps[index]) feedback[index] = `Day ${index} has ${temps[index]}°, and the new day has ${temps[today]}° too. Equal is not warmer.`;
      else if (temps[today] < temps[index]) feedback[index] = `Day ${index} has ${temps[index]}°. The new day, with ${temps[today]}°, is not warmer than that.`;
      else feedback[index] = `Day ${index} will get its turn, but it is not nearest the door. The new day cannot see it yet.`;
    }
    if (answer !== n) feedback[n] = "Look at the day nearest the door. Is the new day warmer than it?";
    return {
      kind: "cell",
      cells: n + 1,
      question,
      answer,
      feedback,
      otherwise: "Only a day that is still in the waiting room can leave.",
      why: answer === n ? "Nobody. The new day is not warmer than the day nearest the door, so everyone keeps waiting." : `Day ${answer}. It sits nearest the door, and the new day is warmer than it.`,
    };
  };

  frames.push({
    scene,
    caption: practice ? `Your turn, on new temperatures: ${temps.join(", ")}. Each time a day arrives, you say who leaves the waiting room.` : "The waiting room starts empty. The days arrive one at a time, from day 0.",
    codeLine: line(2),
    state: base(null),
  });

  for (let today = 0; today < n; today++) {
    const temp = temps[today];
    const roomWasEmpty = waiting.length === 0;
    let left = 0;

    if (roomWasEmpty) {
      // In the practice run this is told together with sitting down: there is nothing to decide.
      if (!practice) frames.push({ scene, caption: `Day ${today} arrives with ${temp}°. The waiting room is empty, so nobody can leave.`, codeLine: line(4), state: base(today) });
    } else {
      const top = door();
      const warmer = temp > temps[top];
      const equal = temp === temps[top];
      const kind = warmer ? "first" : equal ? "equal" : null;
      const ask = practice || (kind !== null && !asked[kind] && (kind !== "first" || today >= showcase));
      const arrival: F = {
        scene,
        caption: ask ? `Day ${today} arrives with ${temp}°. ${waiting.length === 1 ? "One day is" : `${waiting.length} days are`} in the waiting room.` : `Day ${today} arrives with ${temp}°. It looks at the day nearest the door: day ${top}, with ${temps[top]}°.`,
        codeLine: line(4),
        state: base(today),
      };
      if (ask) {
        if (kind) asked[kind] = true;
        arrival.state = { ...arrival.state, askNobody: true };
        arrival.quiz = leaveQuiz(today, warmer ? top : n, "A new day arrived. Which waiting day gets its answer first? Click it, or click “nobody”.");
      }
      frames.push(arrival);
    }

    while (waiting.length > 0) {
      compared++;
      const top = door();
      if (temp <= temps[top]) break;
      waiting.pop();
      answers[top] = today - top;
      left++;
      const leaving: F = {
        scene,
        caption: `${left > 1 ? `Now day ${top} (${temps[top]}°) is nearest the door. ${temp}° is warmer, so it leaves too.` : `${temp}° is warmer than ${temps[top]}°, so day ${top} leaves the waiting room.`} Its wait is ${days(today - top)}: from day ${top} to day ${today}.`,
        codeLine: line(6),
        state: { ...base(today), tones: paint(today, (index) => (index === top ? "done" : null)), link: { from: top, to: today, tone: "wait", label: `waited ${days(today - top)}` } },
      };
      if (waiting.length > 0 && (practice || !asked.next)) {
        asked.next = true;
        leaving.state = { ...leaving.state, askNobody: true };
        leaving.quiz = leaveQuiz(today, temp > temps[door()] ? door() : n, `Day ${top} has left. Does anyone else leave now? Click that day, or click “nobody”.`);
      }
      frames.push(leaving);
    }

    if (!roomWasEmpty && left === 0) {
      const top = door();
      if (temp === temps[top]) {
        frames.push({
          scene,
          caption: `The Equal Day Trap. ${temp}° is the same as day ${top}, not warmer, so nobody leaves. Letting day ${top} out now would give it a wrong wait of ${today - top}.`,
          codeLine: line(4),
          state: { ...base(today), tones: paint(today, (index) => (index === top ? "miss" : null)), link: { from: top, to: today, tone: "wrong", label: "✕ equal is not warmer" } },
        });
      }
    }

    const stays = waiting.length > 0 ? door() : null;
    waiting.push(today);
    if (waiting.length > fullest.length) fullest = [...waiting];
    frames.push({
      scene,
      caption: roomWasEmpty
        ? `${practice ? `Day ${today} arrives with ${temp}°. The waiting room is empty, so it` : `Day ${today}`} sits down in the waiting room, to wait for a warmer day.`
        : stays === null
          ? `The waiting room is empty now. Day ${today} sits down to wait for its own warmer day.`
          : temp === temps[stays]
            ? `Day ${today} sits down nearest the door. Now both days with ${temp}° wait for a warmer day.`
            : `${temp}° is not warmer than day ${stays} (${temps[stays]}°), so ${left > 0 ? "nobody else" : "nobody"} leaves. Day ${today} sits down nearest the door.`,
      codeLine: line(8),
      state: base(today),
    });
  }

  const leftovers = [...waiting];
  for (const day of leftovers) answers[day] = 0;
  frames.push({
    scene,
    caption: `No more days will arrive. ${leftovers.length === 1 ? `Day ${leftovers[0]} is` : `D${nameDays(leftovers).slice(1)} are`} still in the waiting room. No warmer day came, so ${leftovers.length === 1 ? "it gets" : "each of them gets"} 0.`,
    codeLine: line(1),
    state: { ...base(null), tones: paint(null, (index) => (leftovers.includes(index) ? "edge" : null)) },
  });
  const result = answers.map((wait) => wait ?? 0).join(",");
  const finished: WaitingRoomState = { ...base(null), tones: tones(n, () => "hit") };
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${result}. You let every day out yourself.` : `Every day has its wait. The answer is ${result}.`,
    codeLine: line(10),
    state: finished,
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each day sits down once and leaves at most once, so the looks at the door cannot pile up. Here that was ${looks(compared)} for ${days(n)}.`,
      codeLine: 4,
      state: { ...finished, counter: { label: "looks", value: compared } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). In a long cold spell every day would sit in the waiting room at once. Here it held ${days(fullest.length)} at its fullest.`,
      codeLine: 2,
      state: { ...finished, waiting: fullest, roomLit: true },
    });
  }
  return frames;
}

export const dailyTemperaturesStory: ProblemStory<WaitingRoomState> = {
  slugs: ["lc-739"],
  pattern: "Monotonic stack",
  trigger: "“for each item, how far away is the next bigger one?”",
  insight: "A waiting room. Every day waits there for a warmer day, and the last one in sits nearest the door. A warmer day lets them out from the door inwards.",
  metaphor: {
    name: "The Waiting Room",
    legend: "waiting room = the stack of day numbers · nearest the door = top of the stack · sits down = push · leaves with its wait = pop",
    terms: ["waiting room", "door", "sits down", "leaves", "waiting"],
  },
  traps: [{ name: "The Equal Day Trap", rule: "Equal is not warmer. Let a day out only with a strict >, or days with the same temperature get a wrong wait." }],
  template: [
    "keep a stack of positions that have no answer yet;",
    "for (i = 0; i < n; i++) {",
    "    while (stack is not empty && value[i] beats value[top of stack])",
    "        answer[pop] = i - popped position;",
    "    push i;",
    "}",
    "whatever is left on the stack keeps the default answer;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each day sits down once and leaves at most once",
    space: "O(n)",
    spaceWhy: "in a steady cold spell every day is in the waiting room at once",
  },
  code: CODE,
  examples: [
    { label: "[73,74,75,71,69,72,76,73]", input: "73,74,75,71,69,72,76,73", expected: "1,1,4,2,1,1,0,0" },
    { label: "[30,40,50,60]", input: "30,40,50,60", expected: "1,1,1,0", note: "Every day is warmer than the last" },
    { label: "[70,70,68,71]", input: "70,70,68,71", expected: "3,2,1,0", note: "Tricky: two days with the same temperature" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-84", title: "Largest Rectangle in Histogram" },
    { slug: "lc-42", title: "Trapping Rain Water" },
    { slug: "lc-239", title: "Sliding Window Maximum" },
  ],
  answer: (input) => solve(parse(input)).join(","),
  frames: (input) => {
    const temps = parse(input);
    return [
      ...pictureFrames(temps),
      ...slowFrames(temps),
      ...insightFrames(temps),
      ...solutionFrames(temps),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(temps), tones: tones(temps.length, () => "hit"), answers: solve(temps), waiting: solve(temps).flatMap((wait, day) => (wait === 0 ? [day] : [])) },
      },
    ];
  },
  View: WaitingRoomView,
};
