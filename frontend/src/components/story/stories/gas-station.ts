import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokGasView, type GrokGasState } from "../grok-gas-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokGasState>;
type Circuit = { gas: number[]; cost: number[] };

const PRACTICE = "gas=[1,2,3], cost=[3,2,2]";

const CODE = [
  "int total = 0;",
  "int tank = 0;",
  "int start = 0;",
  "for (int i = 0; i < gas.length; i++) {",
  "    int gain = gas[i] - cost[i];",
  "    total += gain;",
  "    tank += gain;",
  "    if (tank < 0) {",
  "        start = i + 1;",
  "        tank = 0;",
  "    }",
  "}",
  "return total < 0 ? -1 : start;",
];

function parse(raw: string): Circuit {
  const lists = [...raw.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].split(/[,\s]+/).filter(Boolean).map(Number));
  return { gas: lists[0] ?? [], cost: lists[1] ?? [] };
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function blank({ gas, cost }: Circuit): GrokGasState {
  return { gas, cost, tones: tones(gas.length, () => null), here: null, start: null, tank: null, total: null, dry: null, failed: false, note: null, trapNote: null, counter: null };
}

function solve({ gas, cost }: Circuit): number {
  const n = gas.length;
  let total = 0;
  let tank = 0;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const gain = gas[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) {
      start = i + 1;
      tank = 0;
    }
  }
  return total < 0 ? -1 : start;
}

/** Independent: try every start and drive a lap. */
function brute({ gas, cost }: Circuit): { start: number; laps: number } {
  const n = gas.length;
  let laps = 0;
  for (let start = 0; start < n; start++) {
    let tank = 0;
    let steps = 0;
    for (; steps < n; steps++) {
      laps++;
      const at = (start + steps) % n;
      tank += gas[at] - cost[at];
      if (tank < 0) break;
    }
    if (steps === n) return { start, laps };
  }
  return { start: -1, laps };
}

function pictureFrames(input: Circuit): Frame[] {
  const n = input.gas.length;
  const answer = solve(input);
  const total = input.gas.reduce((s, g, i) => s + g - input.cost[i], 0);
  const frames: Frame[] = [
    { scene: "picture", caption: "Stations sit on a circle. Each box shows gas in, then the cost to reach the next.", state: blank(input) },
  ];
  if (answer >= 0) {
    frames.push({
      scene: "picture",
      caption: `Starting at station ${answer} is allowed: the tank never goes below 0 for a full lap.`,
      state: { ...blank(input), start: answer, tones: tones(n, (i) => (i === answer ? "done" : null)), total, tank: 0, note: `start at ${answer}` },
    });
  } else {
    frames.push({
      scene: "picture",
      caption: `The whole circle is short by ${-total} gas. No start can finish a lap.`,
      state: { ...blank(input), failed: true, total, trapNote: "not enough gas" },
    });
  }
  const dry = input.gas.findIndex((_, i) => input.gas[i] - input.cost[i] < 0);
  if (dry >= 0) {
    frames.push({
      scene: "picture",
      caption: `Station ${dry} spends more than it gives. Starting a stretch there runs the tank dry.`,
      state: { ...blank(input), here: dry, dry, tank: input.gas[dry] - input.cost[dry], total },
    });
  }
  frames.push({
    scene: "picture",
    caption: answer >= 0 ? `The goal: the unique start that finishes the circle. Here it is station ${answer}.` : "The goal: the start that finishes the circle, or -1 if the circle is short.",
    state: { ...blank(input), start: answer >= 0 ? answer : null, failed: answer < 0, total, tones: tones(n, (i) => (i === answer ? "done" : null)) },
  });
  return frames;
}

function slowFrames(input: Circuit): Frame[] {
  const n = input.gas.length;
  const frames: Frame[] = [];
  let work = 0;
  let shown = 0;
  for (let start = 0; start < n; start++) {
    let tank = 0;
    let steps = 0;
    for (; steps < n; steps++) {
      work++;
      const at = (start + steps) % n;
      tank += input.gas[at] - input.cost[at];
      if (tank < 0) break;
    }
    if (shown < 3) {
      shown++;
      const ok = steps === n;
      frames.push({
        scene: "slow",
        caption: ok
          ? `The slow way: start at station ${start} and drive a full lap. The tank stays non-negative.`
          : `Start at station ${start}. The tank dies after ${steps + 1} stops, so try the next start.`,
        state: {
          ...blank(input),
          start,
          here: (start + Math.min(steps, n - 1)) % n,
          tank,
          dry: ok ? null : (start + steps) % n,
          tones: tones(n, (i) => (i === start ? "window" : null)),
          counter: { label: "stops driven", value: String(work) },
        },
      });
    }
    if (steps === n) break;
  }
  const found = brute(input);
  frames.push({
    scene: "slow",
    caption: `We drove ${work} stops across starts. ${found.start >= 0 ? `A lap works from station ${found.start}.` : "Every start fails."} This is O(n²) time.`,
    state: { ...blank(input), start: found.start >= 0 ? found.start : null, failed: found.start < 0, counter: { label: "stops driven", value: String(work) } },
  });
  return frames;
}

function insightFrames(input: Circuit): Frame[] {
  const n = input.gas.length;
  let tank = 0;
  let firstDry: number | null = null;
  for (let i = 0; i < n; i++) {
    tank += input.gas[i] - input.cost[i];
    if (tank < 0) {
      firstDry = i;
      break;
    }
  }
  const total = input.gas.reduce((s, g, i) => s + g - input.cost[i], 0);
  const answer = solve(input);
  return [
    {
      scene: "insight",
      caption: firstDry === null
        ? "Picture a tank on a circle. This stretch never runs dry, so start stays at station 0."
        : `Picture a tank on a circle. At station ${firstDry} the tank goes dry. No start inside this stretch can work.`,
      state: {
        ...blank(input),
        dry: firstDry,
        here: firstDry,
        tank: firstDry === null ? tank : tank,
        tones: tones(n, (i) => (firstDry !== null && i <= firstDry ? "miss" : null)),
      },
    },
    {
      scene: "insight",
      caption: firstDry === null
        ? "The next try would begin after a dry station. Here there is none."
        : `Move the start to the station after the dry one. Reset the tank to 0 and keep driving.`,
      state: {
        ...blank(input),
        start: firstDry === null ? 0 : firstDry + 1 < n ? firstDry + 1 : 0,
        dry: firstDry,
        tank: 0,
      },
    },
    {
      scene: "insight",
      caption: total < 0
        ? `The circle total is ${total}. Even a unique-looking start is impossible. Return -1.`
        : `The circle has enough gas in total. The unique start is station ${answer}.`,
      state: { ...blank(input), start: answer >= 0 ? answer : null, failed: total < 0, total, note: total < 0 ? "short circle" : `start ${answer}` },
    },
  ];
}

function dryQuiz(next: number, n: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  for (let i = 0; i < n; i++) {
    if (i === next) continue;
    feedback[i] = i === next - 1 ? "That station is where the tank died. The next stretch begins after it." : "The next stretch begins at the station after the dry one.";
  }
  return {
    kind: "cell",
    cells: n,
    numbered: true,
    question: "The tank just ran dry. Which station starts the next stretch? Click that station.",
    answer: next,
    feedback,
    otherwise: "The next stretch begins at the station after the dry one.",
    why: "A start inside a dry stretch cannot work. Move start to the next station and reset the tank.",
  };
}

function totalQuiz(short: boolean): StoryQuiz {
  return {
    kind: "choice",
    question: "The walk is done. The circle total may be short. What do we return?",
    options: ["The candidate start, without looking at the total", "If the circle is short, -1. Otherwise the start"],
    answer: 1,
    why: short
      ? "The Unchecked Start Trap would return a start even when the circle does not have enough gas."
      : "A unique start only exists when the whole circle has enough gas.",
  };
}

function solutionFrames(input: Circuit, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const n = input.gas.length;
  let total = 0;
  let tank = 0;
  let start = 0;
  let askedDry = false;
  let showedTrap = false;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new circle. You move the start when the tank dies.` : "The tank starts empty. The candidate start is station 0. Total is 0.",
    codeLine: line(2),
    state: { ...blank(input), start: 0, tank: 0, total: 0 },
  });

  for (let i = 0; i < n; i++) {
    const gain = input.gas[i] - input.cost[i];
    frames.push({
      scene,
      caption: `At station ${i} the tank gets ${gain >= 0 ? `+${gain}` : String(gain)}.`,
      codeLine: line(4),
      state: { ...blank(input), here: i, start, tank, total, tones: tones(n, (j) => (j === i ? "window" : j < i ? "faded" : null)) },
    });
    total += gain;
    tank += gain;
    if (tank < 0) {
      const next = i + 1;
      const clash: Frame = {
        scene,
        caption: `The tank is ${tank}. This stretch has died.`,
        codeLine: line(7),
        state: { ...blank(input), here: i, start, tank, total, dry: i, tones: tones(n, (j) => (j === i ? "miss" : start <= j && j <= i ? "window" : "faded")) },
      };
      if ((practice || !askedDry) && next < n) {
        askedDry = true;
        clash.quiz = dryQuiz(next, n);
      }
      frames.push(clash);
      start = next;
      tank = 0;
      frames.push({
        scene,
        caption: next < n ? `Move the start to station ${start} and reset the tank to 0.` : "The start walked off the end of the row.",
        codeLine: line(8),
        state: { ...blank(input), start: start < n ? start : null, tank: 0, total, dry: i, tones: tones(n, (j) => (j < start ? "faded" : j === start ? "window" : null)) },
      });
    } else {
      frames.push({
        scene,
        caption: `The tank is ${tank}. This stretch can continue.`,
        codeLine: line(6),
        state: { ...blank(input), here: i, start, tank, total, tones: tones(n, (j) => (j === start ? "done" : j === i ? "hit" : j < i ? "faded" : null)) },
      });
    }
  }

  const short = total < 0;
  if (!showedTrap && (short || practice)) {
    showedTrap = true;
    frames.push({
      scene,
      caption: short
        ? `The Unchecked Start Trap! Returning start ${start} would ignore a short circle. Total is ${total}.`
        : `Check the circle total before trusting the start. Total is ${total}, so a lap exists.`,
      codeLine: line(12),
      quiz: totalQuiz(short),
      state: { ...blank(input), start: start < n ? start : null, total, failed: short, trapNote: short ? "The Unchecked Start Trap" : null },
    });
  }

  const answer = short ? -1 : start;
  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${answer}. You moved the start yourself.` : `The answer is ${answer}.`,
    codeLine: line(12),
    state: { ...blank(input), start: answer >= 0 ? answer : null, failed: short, total, tones: tones(n, (i) => (i === answer ? "done" : null)) },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each of the ${n} stations was visited once.`,
      codeLine: 3,
      state: { ...blank(input), start: answer >= 0 ? answer : null, total, counter: { label: "stations visited", value: String(n) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the tank, the total, and the start are stored.",
      codeLine: 0,
      state: { ...blank(input), start: answer >= 0 ? answer : null, total, counter: { label: "numbers stored", value: "3" } },
    });
  }
  return frames;
}

export const gasStationStory: ProblemStory<GrokGasState> = {
  slugs: ["lc-134"],
  pattern: "Greedy circuit",
  trigger: "stations on a circle, each with gas and a cost to reach the next, and you start with an empty tank",
  insight: "A tank on a circle. If a stretch runs dry, no start inside it works, so move start to the next station. If the whole circle is short, return -1.",
  metaphor: { name: "The tank on a circle", legend: "tank = current stretch · start = candidate station · total = gas minus cost for the whole circle", terms: ["tank", "stretch", "station", "circle"] },
  traps: [
    {
      name: "The Unchecked Start Trap",
      rule: "If the circle total is negative, return -1. A unique start only exists when the whole circle has enough gas.",
    },
  ],
  template: [
    "total = 0, tank = 0, start = 0",
    "for each station:",
    "    add gain to total and tank",
    "    if tank < 0: start = next station, tank = 0",
    "return total < 0 ? -1 : start",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each station is visited once",
    space: "O(1)",
    spaceWhy: "only total, tank, and start are stored",
  },
  code: CODE,
  examples: [
    { label: "unique start", input: "gas=[1,2,3,4,5], cost=[3,4,5,1,2]", expected: "3" },
    { label: "short circle", input: "gas=[2,3,4], cost=[3,4,3]", expected: "-1", note: "Total is negative: no start works." },
    { label: "wrap start", input: "gas=[5,1,2,3,4], cost=[4,4,1,5,1]", expected: "4" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-45", title: "Jump Game II" },
    { slug: "lc-55", title: "Jump Game" },
    { slug: "lc-122", title: "Best Time to Buy and Sell Stock II" },
  ],
  answer: (input) => String(solve(parse(input))),
  frames: (input) => {
    const circuit = parse(input);
    const answer = solve(circuit);
    return [
      ...pictureFrames(circuit),
      ...slowFrames(circuit),
      ...insightFrames(circuit),
      ...solutionFrames(circuit),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(circuit), start: answer >= 0 ? answer : null, failed: answer < 0, total: circuit.gas.reduce((s, g, i) => s + g - circuit.cost[i], 0) },
      },
    ];
  },
  View: GrokGasView,
};
