import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokIdleView, type GrokIdleSlot, type GrokIdleState } from "../grok-idle-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokIdleState>;
type Job = { tasks: string[]; n: number };

const PRACTICE = 'tasks=["A","A","B","B","C"], n=1';

const CODE = [
  "int[] counts = new int[26];",
  "int maxCount = 0;",
  "for (char task : tasks) {",
  "    counts[task - 'A']++;",
  "    maxCount = Math.max(maxCount, counts[task - 'A']);",
  "}",
  "int ties = 0;",
  "for (int count : counts) {",
  "    if (count == maxCount) ties++;",
  "}",
  "return Math.max(tasks.length, (maxCount - 1) * (n + 1) + ties);",
];

function parse(raw: string): Job {
  const letters = [...raw.matchAll(/"([A-Z])"/g)].map((m) => m[1]);
  const n = Number(raw.match(/n\s*=\s*(-?\d+)/)?.[1] ?? "0");
  return { tasks: letters, n };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function formula(tasks: string[], n: number): { maxCount: number; ties: number; frame: number; answer: number } {
  const counts = new Array(26).fill(0);
  let maxCount = 0;
  for (const task of tasks) {
    const i = task.charCodeAt(0) - 65;
    counts[i]++;
    maxCount = Math.max(maxCount, counts[i]);
  }
  let ties = 0;
  for (const count of counts) if (count === maxCount) ties++;
  const frame = (maxCount - 1) * (n + 1) + ties;
  return { maxCount, ties, frame, answer: Math.max(tasks.length, frame) };
}

function calendar(tasks: string[], n: number): GrokIdleSlot[] {
  const { maxCount, ties, frame, answer } = formula(tasks, n);
  const columns = n + 1;
  const slots: GrokIdleSlot[] = [];
  const letters = [...new Set(tasks)].sort((a, b) => {
    const ca = tasks.filter((t) => t === a).length;
    const cb = tasks.filter((t) => t === b).length;
    return cb - ca || a.localeCompare(b);
  });
  const busy = letters.filter((l) => tasks.filter((t) => t === l).length === maxCount);
  for (let row = 0; row < maxCount - 1; row++) {
    for (let col = 0; col < columns; col++) {
      if (col < busy.length) slots.push({ text: busy[col], idle: false, tone: "done" });
      else slots.push({ text: "·", idle: true, tone: "miss" });
    }
  }
  for (let t = 0; t < ties; t++) slots.push({ text: busy[t] ?? "?", idle: false, tone: "hit" });
  while (slots.length < answer) slots.push({ text: "·", idle: false, tone: "window" });
  // Fill leftover tasks into idle slots for the picture, without claiming a real scheduler.
  const leftover = letters.filter((l) => !busy.includes(l));
  let li = 0;
  for (const slot of slots) {
    if (slot.idle && li < leftover.length) {
      slot.text = leftover[li++];
      slot.idle = false;
      slot.tone = "window";
    }
  }
  return slots.slice(0, Math.max(frame, tasks.length, 1));
}

function blank(job: Job, slots: GrokIdleSlot[] = []): GrokIdleState {
  return {
    tasks: job.tasks,
    taskTones: tones(job.tasks.length, () => null),
    slots,
    columns: job.n + 1,
    maxCount: null,
    ties: null,
    frame: null,
    answer: null,
    note: null,
    trapNote: null,
    counter: null,
    pickOn: "slots",
  };
}

function pictureFrames(job: Job): Frame[] {
  const { maxCount, ties, frame, answer } = formula(job.tasks, job.n);
  const slots = calendar(job.tasks, job.n);
  return [
    { scene: "picture", caption: `Each chip is a task. Two of the same letter must sit at least ${job.n} slots apart.`, state: blank(job) },
    {
      scene: "picture",
      caption: `The busiest letter appears ${maxCount} times and sets a calendar of groups of ${job.n + 1} slots.`,
      state: { ...blank(job, slots), maxCount, ties, frame, taskTones: tones(job.tasks.length, (i) => (job.tasks.filter((t) => t === job.tasks[i]).length === maxCount ? "edge" : null)) },
    },
    answer > frame
      ? {
          scene: "picture",
          caption: `Other letters fill every idle slot, so the calendar cannot be shorter than the ${job.tasks.length} tasks.`,
          state: { ...blank(job, slots), frame, answer, trapNote: "frame alone would be too small" },
        }
      : {
          scene: "picture",
          caption: "Idle slots (dots) are required. The calendar is longer than the list of tasks.",
          state: { ...blank(job, slots), frame, answer, note: `${frame - job.tasks.length} idle` },
        },
    {
      scene: "picture",
      caption: `The goal: the length of the shortest calendar. Here it is ${answer}.`,
      state: { ...blank(job, slots), frame, answer, maxCount, ties },
    },
  ];
}

function slowFrames(job: Job): Frame[] {
  const counts = new Array(26).fill(0);
  for (const task of job.tasks) counts[task.charCodeAt(0) - 65]++;
  const ready = new Array(26).fill(0);
  let done = 0;
  let time = 0;
  let scans = 0;
  const frames: Frame[] = [];
  const built: GrokIdleSlot[] = [];
  while (done < job.tasks.length && time < 40) {
    scans += 26;
    let pick = -1;
    let best = 0;
    for (let i = 0; i < 26; i++) {
      if (counts[i] > 0 && ready[i] <= time && counts[i] > best) {
        best = counts[i];
        pick = i;
      }
    }
    if (pick !== -1) {
      counts[pick]--;
      done++;
      ready[pick] = time + job.n + 1;
      built.push({ text: String.fromCharCode(65 + pick), idle: false, tone: "done" });
    } else {
      built.push({ text: "·", idle: true, tone: "miss" });
    }
    time++;
    if (frames.length < 3) {
      frames.push({
        scene: "slow",
        caption: pick === -1
          ? `The slow way: fill each slot. At time ${time} nothing is ready, so this slot is idle.`
          : `At time ${time} run the ready letter with the most copies left.`,
        state: { ...blank(job, built.map((s) => ({ ...s }))), columns: Math.min(job.n + 1, 6) || 1, counter: { label: "letters scanned", value: String(scans) }, answer: time },
      });
    }
  }
  frames.push({
    scene: "slow",
    caption: `We scanned 26 letters on each of ${time} slots. This is O(t) time if t is the calendar length.`,
    state: { ...blank(job, built), answer: time, counter: { label: "letters scanned", value: String(scans) } },
  });
  return frames;
}

function insightFrames(job: Job): Frame[] {
  const { maxCount, ties, frame, answer } = formula(job.tasks, job.n);
  const slots = calendar(job.tasks, job.n);
  return [
    {
      scene: "insight",
      caption: `Picture a calendar. The busiest letter sets ${maxCount - 1} groups of ${job.n + 1} slots, plus ${ties} on the last row.`,
      state: { ...blank(job, slots), maxCount, ties, frame },
    },
    {
      scene: "insight",
      caption: `That frame is ${frame} long. Extra tasks spill past it and fill the idle slots.`,
      state: { ...blank(job, slots), frame, answer },
    },
    {
      scene: "insight",
      caption: answer > frame
        ? `The Task Count Trap: returning only the frame would say ${frame}, but there are ${job.tasks.length} tasks.`
        : `When idle slots remain, the frame is the answer. Still take the max with the task count.`,
      state: { ...blank(job, slots), frame, answer, trapNote: "The Task Count Trap" },
    },
  ];
}

function tiesQuiz(ties: number): StoryQuiz {
  return {
    kind: "choice",
    question: "How many letters share the highest count?",
    options: ["Only one letter is busiest", "Two or more letters tie for busiest"],
    answer: ties > 1 ? 1 : 0,
    why: "The last row of the calendar holds every letter that ties for the busiest count.",
  };
}

function maxLengthQuiz(tasksLen: number, frame: number): StoryQuiz {
  const taskWins = tasksLen > frame;
  return {
    kind: "choice",
    question: `The frame is ${frame} and there are ${tasksLen} tasks. What length do we return?`,
    options: [`The frame only: ${frame}`, `The larger of the frame and the task count`],
    answer: 1,
    why: taskWins
      ? "The Task Count Trap forgets extra letters that fill every idle slot. Return the larger number."
      : "Idle slots remain, so the frame is longer, but we still take the max so we never go below the task count.",
  };
}

function solutionFrames(job: Job, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const { maxCount, ties, frame, answer } = formula(job.tasks, job.n);
  const slots = calendar(job.tasks, job.n);
  const base = blank(job, slots);

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new list. You pick the busiest letter and the final length.` : "Count each letter. Start the busiest count at 0.",
    codeLine: line(1),
    state: { ...base, slots: [], pickOn: "tasks" },
  });

  const pickBusy: Frame = {
    scene,
    caption: "Look at the chips. Count how many letters share the highest count.",
    codeLine: line(4),
    state: { ...base, slots: [], pickOn: "tasks", taskTones: tones(job.tasks.length, () => "idle") },
  };
  pickBusy.quiz = tiesQuiz(ties);
  frames.push(pickBusy);

  frames.push({
    scene,
    caption: `The busiest letter appears ${maxCount} times. ${ties} letter${ties === 1 ? "" : "s"} tie for that count.`,
    codeLine: line(8),
    state: { ...base, maxCount, ties, pickOn: "tasks", taskTones: tones(job.tasks.length, (i) => (job.tasks.filter((t) => t === job.tasks[i]).length === maxCount ? "done" : null)) },
  });

  frames.push({
    scene,
    caption: `The calendar frame is (${maxCount} minus 1) groups of ${job.n + 1}, plus ${ties} on the last row: ${frame}.`,
    codeLine: line(10),
    state: { ...base, maxCount, ties, frame, pickOn: "slots" },
  });

  const trap: Frame = {
    scene,
    caption: practice
      ? `The frame is ${frame}. There are ${job.tasks.length} tasks.`
      : `The Task Count Trap! Returning only ${frame} would ignore extra tasks that fill the idle slots.`,
    codeLine: line(10),
    state: { ...base, frame, answer: frame, trapNote: "The Task Count Trap", pickOn: "slots" },
  };
  trap.quiz = maxLengthQuiz(job.tasks.length, frame);
  frames.push(trap);

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}. You took the larger number.` : `Take the larger of the frame and the task count. The answer is ${answer}.`,
    codeLine: line(10),
    state: { ...base, maxCount, ties, frame, answer, pickOn: "slots" },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). One pass over the ${job.tasks.length} tasks, then a fixed pass over 26 letters.`,
      codeLine: 2,
      state: { ...base, answer, counter: { label: "tasks read", value: String(job.tasks.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). A count row of 26 letters, no matter how long the list is.",
      codeLine: 0,
      state: { ...base, answer, counter: { label: "count slots", value: "26" } },
    });
  }
  return frames;
}

export const taskSchedulerStory: ProblemStory<GrokIdleState> = {
  slugs: ["lc-621"],
  pattern: "Greedy: idle-frame formula",
  trigger: "tasks labeled A–Z, and two of the same letter must be at least n slots apart",
  insight: "A calendar set by the busiest letter: (maxCount - 1) groups of n + 1 slots, plus the letters that tie. Then take the max with the number of tasks.",
  metaphor: { name: "The calendar", legend: "frame = (maxCount-1)*(n+1)+ties · idle = an empty slot · busiest = maxCount", terms: ["calendar", "idle", "frame", "busiest"] },
  traps: [
    {
      name: "The Task Count Trap",
      rule: "If other letters fill every gap, there is no idle time. Return the larger of the frame and the number of tasks.",
    },
  ],
  template: [
    "count each letter, remember maxCount and ties",
    "frame = (maxCount - 1) * (n + 1) + ties",
    "return max(task count, frame)",
  ],
  complexity: {
    slow: "O(t)",
    time: "O(n)",
    timeWhy: "one pass over the tasks, then a 26-long pass for ties",
    space: "O(1)",
    spaceWhy: "a count array of length 26",
  },
  code: CODE,
  examples: [
    { label: "needs idle", input: 'tasks=["A","A","A","B","B","B"], n=2', expected: "8" },
    { label: "tasks fill gaps", input: 'tasks=["A","C","A","B","D","B"], n=1', expected: "6", note: "Frame is smaller than the task count." },
    { label: "n = 0", input: 'tasks=["A","A","A"], n=0', expected: "3" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-347", title: "Top K Frequent Elements" },
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-1046", title: "Last Stone Weight" },
  ],
  answer: (input) => {
    const job = parse(input);
    const counts = new Array(26).fill(0);
    for (const task of job.tasks) counts[task.charCodeAt(0) - 65]++;
    const ready = new Array(26).fill(0);
    let done = 0;
    let time = 0;
    while (done < job.tasks.length && time < 10000) {
      let pick = -1;
      let best = 0;
      for (let i = 0; i < 26; i++) {
        if (counts[i] > 0 && ready[i] <= time && counts[i] > best) {
          best = counts[i];
          pick = i;
        }
      }
      if (pick !== -1) {
        counts[pick]--;
        done++;
        ready[pick] = time + job.n + 1;
      }
      time++;
    }
    return String(time);
  },
  frames: (input) => {
    const job = parse(input);
    const { answer, frame, maxCount, ties } = formula(job.tasks, job.n);
    const slots = calendar(job.tasks, job.n);
    return [
      ...pictureFrames(job),
      ...slowFrames(job),
      ...insightFrames(job),
      ...solutionFrames(job),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(job, slots), maxCount, ties, frame, answer },
      },
    ];
  },
  View: GrokIdleView,
};
