import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp2StonesView, type StoneHop, type StonesState } from "../agy-dp2-stones-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh numbers for the "your turn" run. The first number, 2, would light stone 4 by itself if the walk went forwards. */
const PRACTICE = "nums=[2,3,5,4]";

const CODE = [
  "int total = 0;",
  "for (int x : nums) {",
  "    total += x;",
  "}",
  "if (total % 2 != 0) {",
  "    return false;",
  "}",
  "int target = total / 2;",
  "boolean[] reachable = new boolean[target + 1];",
  "reachable[0] = true;",
  "for (int x : nums) {",
  "    for (int sum = target; sum >= x; sum--) {",
  "        if (reachable[sum - x]) {",
  "            reachable[sum] = true;",
  "        }",
  "    }",
  "}",
  "return reachable[target];",
];

/** The slow way stops counting here, so a large input cannot freeze the page. */
const SLOW_CAP = 20000;

function parseInput(raw: string): number[] {
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const nums = list.split(",").map((part) => Number.parseInt(part.trim(), 10)).filter((value) => value > 0);
  return nums.length === 0 ? [1, 5, 11, 5] : nums;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function listOf(items: (string | number)[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const sumOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

/** Independent solver for `answer()`: collect every sum that some group of the numbers can make. */
function canSplit(nums: number[]): boolean {
  const total = sumOf(nums);
  if (total % 2 !== 0) return false;
  let sums = new Set([0]);
  for (const value of nums) sums = new Set([...sums, ...[...sums].map((sum) => sum + value)]);
  return sums.has(total / 2);
}

type Check = { sum: number; from: number; lights: boolean; already: boolean };
type Round = {
  index: number;
  x: number;
  /** The stones before this number came. */
  before: boolean[];
  checks: Check[];
  /** Stones this number would light if the walk went forwards, in the order they light. */
  forwards: number[];
};
type Table = {
  total: number;
  target: number | null;
  rounds: Round[];
  lit: boolean[];
  /** Position of the number whose hop first lit each stone. */
  via: (number | null)[];
  checks: number;
};

/** The real algorithm, recorded number by number. */
function fill(nums: number[]): Table {
  const total = sumOf(nums);
  if (total % 2 !== 0) return { total, target: null, rounds: [], lit: [], via: [], checks: 0 };
  const target = total / 2;
  const lit = Array.from({ length: target + 1 }, () => false);
  const via: (number | null)[] = Array.from({ length: target + 1 }, () => null);
  lit[0] = true;
  const rounds: Round[] = [];
  let count = 0;
  nums.forEach((x, index) => {
    const before = [...lit];
    const checks: Check[] = [];
    for (let sum = target; sum >= x; sum--) {
      count++;
      const lights = lit[sum - x] && !lit[sum];
      checks.push({ sum, from: sum - x, lights, already: lit[sum] });
      if (lit[sum - x] && !lit[sum]) {
        lit[sum] = true;
        via[sum] = index;
      }
    }
    // The trap, really run on the same stones: the same loop, walking up.
    const wrong = [...before];
    const forwards: number[] = [];
    for (let sum = x; sum <= target; sum++) {
      if (wrong[sum - x] && !wrong[sum]) {
        wrong[sum] = true;
        forwards.push(sum);
      }
    }
    rounds.push({ index, x, before, checks, forwards });
  });
  return { total, target, rounds, lit, via, checks: count };
}

/** Positions of the numbers whose hops lead to `stone`, first hop first. */
function groupFor(nums: number[], table: Table, stone: number): number[] {
  const group: number[] = [];
  let at = stone;
  while (at > 0) {
    const index = table.via[at];
    if (index === null) return [];
    group.unshift(index);
    at -= nums[index];
  }
  return group;
}

function chainHops(nums: number[], group: number[], tone: StoneHop["tone"]): StoneHop[] {
  let at = 0;
  return [...group]
    .sort((a, b) => a - b)
    .map((index) => {
      const hop: StoneHop = { from: at, to: at + nums[index], label: `+${nums[index]}`, tone, level: 0 };
      at += nums[index];
      return hop;
    });
}

type Draw = {
  /** null hides the stones. */
  lit?: boolean[] | null;
  marked?: boolean;
  chipTones?: Record<number, CellTone>;
  stoneTones?: Record<number, CellTone>;
  here?: number | null;
  hops?: StoneHop[];
  note?: string | null;
  counter?: { label: string; value: string } | null;
  trap?: string | null;
};

function draw(nums: number[], options: Draw = {}): StonesState {
  const lit = options.lit ?? null;
  const marked = options.marked ?? true;
  return {
    chipsLabel: "numbers",
    chips: nums.map((value, index) => ({ text: String(value), tone: options.chipTones?.[index] ?? "idle" })),
    rowLabels: [],
    stones: lit
      ? lit.map((on, sum) => ({
          marks: [marked ? (on ? "yes" : "–") : null],
          tone: options.stoneTones?.[sum] ?? (sum === options.here && !on ? "edge" : marked && on ? "hit" : "idle"),
          label: String(sum),
        }))
      : [],
    items: null,
    itemsLabel: "",
    itemsAt: "under",
    here: options.here ?? null,
    pointers: [],
    hops: options.hops ?? [],
    pickMode: "stones",
    bestNote: options.note ?? null,
    trapNote: options.trap ?? null,
    counter: options.counter ?? null,
  };
}

const tonesAt = (positions: number[], tone: CellTone): Record<number, CellTone> => Object.fromEntries(positions.map((position) => [position, tone]));

function finished(nums: number[], table: Table): StonesState {
  if (table.target === null) return draw(nums, { note: `total: ${table.total}, an odd number` });
  const group = table.lit[table.target] ? groupFor(nums, table, table.target) : [];
  const hops = chainHops(nums, group, "best");
  const onChain = new Set(hops.flatMap((hop) => [hop.from, hop.to]));
  return draw(nums, {
    lit: table.lit,
    chipTones: tonesAt(group, "done"),
    stoneTones: Object.fromEntries(table.lit.map((on, sum) => [sum, onChain.has(sum) ? "done" : on ? "hit" : "faded"])),
    hops,
  });
}

function pictureFrames(nums: number[], table: Table): Frame[] {
  const frames: Frame[] = [
    { scene: "picture", caption: `These are the numbers ${nums.join(", ")}. Split them into two piles. Every number goes into one pile or the other.`, state: draw(nums) },
  ];
  const all = [...nums.keys()];
  if (table.target !== null && table.lit[table.target]) {
    const group = groupFor(nums, table, table.target).sort((a, b) => a - b);
    const rest = all.filter((index) => !group.includes(index));
    frames.push({
      scene: "picture",
      caption: `Allowed: ${group.map((index) => nums[index]).join(", ")} in one pile and ${rest.map((index) => nums[index]).join(", ")} in the other. Both piles add up to ${table.target}.`,
      state: draw(nums, { chipTones: { ...tonesAt(group, "hit"), ...tonesAt(rest, "window") }, note: `${table.target} = ${table.target}` }),
    });
  }
  const first = nums[0];
  const others = sumOf(nums) - first;
  if (nums.length > 1 && first !== others) {
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${first} in one pile and ${nums.slice(1).join(", ")} in the other. That is ${first} against ${others}. The two piles must be equal.`,
      state: draw(nums, { chipTones: { ...tonesAt(all.slice(1), "miss"), 0: "window" }, trap: `${first} is not ${others}` }),
    });
  }
  frames.push({ scene: "picture", caption: "The goal: say true if two equal piles can be made, and false if they cannot.", state: draw(nums) });
  return frames;
}

type SlowRun = { choices: number; capped: boolean; found: boolean; tries: { pile: number[]; choicesSoFar: number }[] };

/** Really tries every split: each number goes into the first pile or not. Stops at the first equal split. */
function runSlow(nums: number[]): SlowRun {
  const run: SlowRun = { choices: 0, capped: false, found: false, tries: [] };
  const total = sumOf(nums);
  const pile: number[] = [];
  const go = (index: number, sum: number) => {
    if (run.found || run.capped) return;
    if (index === nums.length) {
      if (run.tries.length < 2) run.tries.push({ pile: [...pile], choicesSoFar: run.choices });
      if (sum * 2 === total) run.found = true;
      return;
    }
    if (run.choices >= SLOW_CAP) {
      run.capped = true;
      return;
    }
    run.choices++;
    pile.push(index);
    go(index + 1, sum + nums[index]);
    pile.pop();
    go(index + 1, sum);
  };
  go(0, 0);
  return run;
}

function slowFrames(nums: number[], run: SlowRun): Frame[] {
  const total = sumOf(nums);
  const frames: Frame[] = run.tries.map((item, index) => {
    const mine = sumOf(item.pile.map((position) => nums[position]));
    const rest = [...nums.keys()].filter((position) => !item.pile.includes(position));
    const told = `${mine} against ${total - mine}`;
    return {
      scene: "slow" as SceneId,
      caption:
        index === 0
          ? `The slow way: for every number choose this pile or that pile, and try every mix. First try: everything in one pile. That is ${told}.`
          : `Step back, move the last number across, and add up again: ${told}.${mine * 2 === total ? " Equal." : ""}`,
      state: draw(nums, { chipTones: { ...tonesAt(item.pile, "window"), ...tonesAt(rest, "edge") }, counter: { label: "choices made", value: String(item.choicesSoFar) } }),
    };
  });
  const count = run.capped ? `more than ${SLOW_CAP}` : String(run.choices);
  frames.push({
    scene: "slow",
    caption: `${count} choices made, and ${run.found ? "an equal split turned up" : "no split was equal"}. With n numbers there can be 2^n mixes to try, and each extra number doubles them: O(2^n) time.`,
    state: draw(nums, { chipTones: tonesAt([...nums.keys()], "faded"), counter: { label: "choices made", value: run.capped ? `${SLOW_CAP}+` : String(run.choices) } }),
  });
  return frames;
}

function insightFrames(nums: number[], table: Table): Frame[] {
  const { total, target } = table;
  if (target === null) {
    return [
      { scene: "insight", caption: `Two equal piles means each pile is exactly half of the total. The total here is ${total}.`, state: draw(nums, { note: `total: ${total}` }) },
      { scene: "insight", caption: `But ${total} is odd: it has no whole half. So the answer is false before any real work. This check always comes first.`, state: draw(nums, { chipTones: tonesAt([...nums.keys()], "miss"), note: `total: ${total}`, trap: `${total} cannot be halved` }) },
    ];
  }
  const dark = Array.from({ length: target + 1 }, () => false);
  const first = nums[0];
  const hop: StoneHop[] = first <= target ? [{ from: 0, to: first, label: `+${first}`, tone: "try", level: 0 }] : [];
  return [
    {
      scene: "insight",
      caption: `Two equal piles means each pile is half of the total. Half of ${total} is ${target}. So the real question is: can some of the numbers add up to exactly ${target}?`,
      state: draw(nums, { note: `total ${total} · half ${target}` }),
    },
    {
      scene: "insight",
      caption: `Picture stepping stones, one for every sum from 0 to ${target}. A stone is lit when some of the numbers seen so far add up to exactly its sum.`,
      state: draw(nums, { lit: dark, marked: false }),
    },
    {
      scene: "insight",
      caption: `A number is a hop of that many stones. The number ${first} lights a stone when the stone ${first} behind it was lit already: that old sum, plus ${first}.`,
      state: draw(nums, { lit: dark, marked: false, chipTones: { 0: "edge" }, stoneTones: { 0: "hit" }, hops: hop }),
    },
    {
      scene: "insight",
      caption: "Each number may be used once. So its hops may only start from stones that were lit before this number came.",
      state: draw(nums, { lit: dark, marked: false, chipTones: { 0: "edge" }, stoneTones: { 0: "hit" }, hops: hop.map((item) => ({ ...item, tone: "best" as const })) }),
    },
  ];
}

function walkStartQuiz(target: number, x: number): StoryQuiz {
  const feedback: Record<number, string> = {
    [x]: `Starting near and walking forwards is the Used Twice Trap: a stone this ${x} has just lit could be hopped from again, by the same ${x}.`,
  };
  if (x !== 0 && target !== 0) feedback[0] = "Stone 0 is where the shortest hop comes from, not a stone this number can land on.";
  return {
    kind: "cell",
    cells: target + 1,
    numbered: target <= 9,
    question: `We walk along the row with the number ${x}. Which stone do we check first? Click it.`,
    answer: target,
    feedback,
    otherwise: "We start at one end of the row. Pick the end that keeps a number from being used twice.",
    why: "Walking backwards, every hop starts from a stone this number has not touched yet. So the number is used once at most.",
  };
}

function hopFromQuiz(target: number, sum: number, x: number): StoryQuiz {
  const feedback: Record<number, string> = { [sum]: "That is the stone we stand on. The hop starts further back." };
  if (x !== 1) feedback[sum - 1] = `That is only one stone back. The number in hand is a hop of ${x} stones.`;
  return {
    kind: "cell",
    cells: target + 1,
    numbered: target <= 9,
    question: `We stand on stone ${sum} with the number ${x} in hand. Which stone must be lit already for stone ${sum} to light up? Click it.`,
    answer: sum - x,
    feedback,
    otherwise: "Count back from the stone we stand on, one stone for each unit of the number in hand.",
    why: `A hop of ${x} that lands on stone ${sum} starts on stone ${sum - x}.`,
  };
}

function furthestNewQuiz(target: number, round: Round, answer: number): StoryQuiz {
  const { x, before } = round;
  const feedback: Record<number, string> = {};
  for (let sum = 0; sum <= target; sum++) {
    if (sum === answer) continue;
    if (before[sum]) feedback[sum] = `Stone ${sum} is lit already. Look for a stone that is dark now.`;
    else if (sum < x) feedback[sum] = `Stone ${sum} is closer than one hop of ${x}, so this number cannot land on it.`;
    else if (!before[sum - x]) feedback[sum] = sum === 2 * x ? `Stone ${sum} would need stone ${x} to be lit before this number came, and it was dark. Using the ${x} twice is the Used Twice Trap.` : `Stone ${sum} would need stone ${sum - x} to be lit, and it is dark.`;
    else feedback[sum] = `Stone ${sum} does light up, but another new stone is further along.`;
  }
  return {
    kind: "cell",
    cells: target + 1,
    numbered: target <= 9,
    question: `The number ${x} hops from every lit stone. Which is the furthest dark stone it lights up? Click it.`,
    answer,
    feedback,
    otherwise: "Hop the number in hand from each lit stone, and see where it lands.",
    why: `Stone ${answer - x} was lit before this number came, and ${answer - x} + ${x} = ${answer}.`,
  };
}

/** Names a run of stones walked downwards: "Stone 7", "Stones 9 and 8", "Stones 11 down to 7". */
function runName(sums: number[]): string {
  if (sums.length === 1) return `Stone ${sums[0]}`;
  if (sums.length === 2) return `Stones ${sums[0]} and ${sums[1]}`;
  return `Stones ${sums[0]} down to ${sums.at(-1)}`;
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on fresh numbers: the reader predicts what each number lights.
 */
function walkFrames(nums: number[], table: Table, scene: SceneId, practice: boolean): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const { total, target } = table;

  if (practice) {
    frames.push({ scene, caption: `Your turn, on new numbers: ${nums.join(", ")}. They add up to ${total}, so the stone to light is ${total / 2}. You say what each number lights.`, state: draw(nums, { note: `total ${total} · half ${total / 2}` }) });
  } else {
    frames.push({ scene, caption: `Add up all the numbers: ${total}. The stone we must light is half of that.`, codeLine: 2, state: draw(nums, { note: `total: ${total}` }) });
  }
  if (target === null) {
    frames.push({
      scene,
      caption: `${total} is odd, so it has no whole half, and there is no stone to aim for. Two piles can never be equal. The answer is false.`,
      codeLine: line(5),
      state: draw(nums, { chipTones: tonesAt([...nums.keys()], "miss"), note: `total: ${total}`, trap: `${total} cannot be halved` }),
    });
    if (!practice) {
      frames.push({ scene, caption: `Time: O(n · target). Here the odd total ended it after adding up ${plural(nums.length, "number")}. With an even total, every number walks back over the stones.`, codeLine: 1, state: draw(nums, { note: `total: ${total}`, counter: { label: "numbers added", value: String(nums.length) } }) });
      frames.push({ scene, caption: "Space: O(target). This time no stones were laid out at all. With an even total there is one yes or no per stone.", codeLine: 8, state: draw(nums, { note: `total: ${total}` }) });
    }
    return frames;
  }

  const dark = Array.from({ length: target + 1 }, () => false);
  const start = dark.map((_, sum) => sum === 0);
  if (!practice) {
    frames.push({ scene, caption: `${total} is even, so it has a whole half: ${target}. The last stone will be stone ${target}.`, codeLine: 7, state: draw(nums, { note: `total ${total} · half ${target}` }) });
    frames.push({
      scene,
      caption: `Lay out the stones 0 to ${target}. A stone will say if some of the numbers seen so far add up to exactly its sum. For now every stone is dark.`,
      codeLine: 8,
      state: draw(nums, { lit: dark }),
    });
    frames.push({ scene, caption: "Stone 0 is lit from the start: taking no numbers at all adds up to 0.", codeLine: 9, state: draw(nums, { lit: start, here: 0 }) });
  }

  let askedStart = false;
  let askedHop = false;
  let toldBackwards = false;
  let shownTrap = false;
  let detailedCheck = false;

  for (const round of table.rounds) {
    const { x, index, before, checks } = round;
    const chip = { [index]: "edge" as CellTone };
    const now = [...before];
    const state = (extra: Draw = {}) => draw(nums, { lit: [...now], chipTones: chip, ...extra });
    const pickUp: Frame = { scene, caption: `Pick up the ${index === 0 ? "first" : "next"} number, ${x}. It is a hop of ${plural(x, "stone")}.`, codeLine: line(10), state: state() };

    if (checks.length === 0) {
      frames.push(pickUp);
      frames.push({ scene, caption: `A hop of ${x} is longer than the whole row of stones, so this number cannot land anywhere. Nothing changes.`, codeLine: line(11), state: state({ chipTones: { [index]: "faded" } }) });
      continue;
    }

    const newStones = checks.filter((check) => check.lights).map((check) => check.sum);
    // The Used Twice Trap: stones that only a forwards walk would light with this one number.
    const twice = round.forwards.filter((sum) => !newStones.includes(sum));

    if (practice) {
      if (!askedStart) {
        askedStart = true;
        frames.push({ ...pickUp, quiz: walkStartQuiz(target, x) });
        frames.push({ scene, caption: `We start at the far end, stone ${target}, and walk backwards down to stone ${x}. That way this ${x} can never hop from a stone it has just lit.`, state: state({ here: target }) });
      } else {
        frames.push(pickUp);
      }
      if (newStones.length > 0) {
        const furthest = Math.max(...newStones);
        frames.push({ scene, caption: index === 0 ? `The number ${x} hops from stones that were lit before it came. Walking backwards, it tries every stone from ${target} down to ${x}.` : `Walking backwards again, the number ${x} tries every stone from ${target} down to ${x}.`, state: state(), quiz: furthestNewQuiz(target, round, furthest) });
        for (const sum of newStones) now[sum] = true;
        frames.push({
          scene,
          caption: newStones.length === 1 ? `${x} lights stone ${newStones[0]}: that is stone ${newStones[0] - x} plus ${x}.` : `${x} lights stones ${listOf(newStones)}: each is a stone that was lit before, plus ${x}.`,
          state: state({ hops: newStones.map((sum) => ({ from: sum - x, to: sum, label: `+${x}`, tone: "best" as const, level: 0 })), stoneTones: tonesAt(newStones, "done") }),
        });
      } else {
        frames.push({ scene, caption: `Every hop of ${x} from a lit stone lands past the row, or on a stone that is lit already. Nothing new lights up.`, state: state({ chipTones: { [index]: "faded" } }) });
      }
      if (twice.length > 0 && !shownTrap) {
        shownTrap = true;
        const bait = twice[0];
        frames.push({
          scene,
          caption: `Stone ${bait - x} is lit now, and ${bait - x} + ${x} = ${bait}. The number ${x} is still in hand.`,
          state: state({ here: bait }),
          quiz: { kind: "choice", question: `Does stone ${bait} light up as well?`, options: ["Yes, it lights up", "No, it stays dark"], answer: 1, why: `Stone ${bait - x} was lit by this very ${x}. Hopping from it would use the ${x} a second time.` },
        });
        frames.push({
          scene,
          caption: `No. That is the Used Twice Trap: stone ${bait - x} was lit by this same ${x}, and there is only one ${x} to use. Walking backwards keeps us safe.`,
          state: state({ hops: [{ from: bait - x, to: bait, label: `+${x} again`, tone: "trap", level: 0, below: true }], stoneTones: { [bait]: "miss" }, trap: `${bait} would need the ${x} twice` }),
        });
      }
      continue;
    }

    // Solution scene.
    if (!askedStart) {
      askedStart = true;
      frames.push({ ...pickUp, quiz: walkStartQuiz(target, x) });
    } else {
      frames.push(pickUp);
    }
    if (!toldBackwards) {
      toldBackwards = true;
      frames.push({
        scene,
        caption: `We start at the far end, stone ${target}, and walk backwards down to stone ${x}. Every hop then starts from a stone this number has not touched yet.`,
        codeLine: 11,
        state: state({ here: target }),
      });
    }

    let plain: Check[] = [];
    const flush = () => {
      if (plain.length === 0) return;
      const sums = plain.map((check) => check.sum);
      const allDarkBehind = plain.every((check) => !before[check.from]);
      frames.push({
        scene,
        caption: allDarkBehind
          ? `${runName(sums)}: the stone ${x} behind ${sums.length === 1 ? "it" : "each one"} is dark, so nothing lights up.`
          : plain.every((check) => check.already)
            ? `${runName(sums)}: lit already, so nothing changes.`
            : `${runName(sums)}: nothing new. The stone ${x} behind is dark, or the stone is lit already.`,
        codeLine: 12,
        state: state({ here: sums.at(-1)!, hops: [{ from: plain.at(-1)!.from, to: sums.at(-1)!, label: `+${x}`, tone: "faded", level: 0 }] }),
      });
      plain = [];
    };

    for (const check of checks) {
      const hop = (tone: StoneHop["tone"]): StoneHop[] => [{ from: check.from, to: check.sum, label: `+${x}`, tone, level: 0 }];
      if (!check.lights) {
        if (!detailedCheck && !check.already) {
          detailedCheck = true;
          frames.push({
            scene,
            caption: `Stand on stone ${check.sum}. A hop of ${x} onto it would start on stone ${check.from}. That stone is dark, so stone ${check.sum} stays dark.`,
            codeLine: 12,
            state: state({ here: check.sum, hops: hop("faded") }),
          });
          continue;
        }
        plain.push(check);
        continue;
      }
      flush();
      if (!askedHop) {
        askedHop = true;
        frames.push({ scene, caption: `Stand on stone ${check.sum}, with the number ${x} in hand.`, codeLine: 12, state: state({ here: check.sum }), quiz: hopFromQuiz(target, check.sum, x) });
      }
      now[check.sum] = true;
      frames.push({
        scene,
        caption: `Stone ${check.sum}: the stone ${x} behind it, stone ${check.from}, is lit. ${check.from} + ${x} = ${check.sum}, so stone ${check.sum} lights up.`,
        codeLine: 13,
        state: state({ here: check.sum, hops: hop("best"), stoneTones: { [check.sum]: "done" } }),
      });
    }
    flush();

    if (twice.length > 0 && !shownTrap) {
      shownTrap = true;
      const trapHops: StoneHop[] = twice.slice(0, 4).map((sum) => ({ from: sum - x, to: sum, label: `+${x}`, tone: "trap", level: 0, below: true }));
      const wrongAnswer = twice.includes(target);
      frames.push({
        scene,
        caption: `The Used Twice Trap: walking forwards instead. Stone ${twice[0] - x} lights, and then the same ${x} hops on from it to stone ${twice[0]}${twice.length > 1 ? ", and on again" : ""}. One ${x} gets used twice.`,
        codeLine: 11,
        state: state({ hops: trapHops, stoneTones: tonesAt(twice, "miss"), trap: `forwards, one ${x} would also light ${twice.length > 4 ? `${twice.slice(0, 4).join(", ")} and more` : listOf(twice)}${wrongAnswer ? ": a wrong true" : ""}` }),
      });
      frames.push({
        scene,
        caption: `Walking backwards, the stones behind us are still as they were before ${x} came. So ${x} lights only ${newStones.length === 0 ? "nothing" : `stone ${listOf(newStones)}`}, and is used once at most.`,
        codeLine: 11,
        state: state({ stoneTones: tonesAt(newStones, "done") }),
      });
    }
  }

  const done = finished(nums, table);
  const group = table.lit[target] ? groupFor(nums, table, target).sort((a, b) => a - b) : [];
  if (practice) {
    frames.push({
      scene,
      caption: table.lit[target]
        ? `Done. Stone ${target} is lit by ${group.map((position) => nums[position]).join(" + ")}, so the answer is true. You lit every stone yourself.`
        : `Done. Stone ${target} stays dark, so the answer is false. You judged every stone yourself.`,
      state: done,
    });
    return frames;
  }
  frames.push({
    scene,
    caption: table.lit[target]
      ? `Every number has had its turn. Stone ${target} is lit by ${group.map((position) => nums[position]).join(" + ")}, and the other numbers make the same ${target}. The answer is true.`
      : `Every number has had its turn. Stone ${target} stays dark: no group of the numbers adds up to ${target}. The answer is false.`,
    codeLine: 17,
    state: { ...done, here: table.lit[target] ? null : target },
  });
  frames.push({
    scene,
    caption: `Time: O(n · target). Each of the ${plural(nums.length, "number")} walks back over at most ${plural(target, "stone")}. Here that was ${plural(table.checks, "stone check")}.`,
    codeLine: 11,
    state: { ...done, counter: { label: "stone checks", value: String(table.checks) } },
  });
  frames.push({
    scene,
    caption: `Space: O(target). One yes or no per stone: ${plural(target + 1, "stone")}, and nothing else is kept.`,
    codeLine: 8,
    state: { ...done, hops: [], stones: done.stones.map((stone) => ({ ...stone, tone: "done" as CellTone })) },
  });
  return frames;
}

export const partitionEqualSubsetSumStory: ProblemStory<StonesState> = {
  slugs: ["lc-416"],
  pattern: "0/1 Knapsack",
  trigger: "“split the numbers into two groups with equal sums” (or: can some of them add up to an exact total, each used once)",
  insight: "Stepping stones for the sums 0 to half the total. Each number is a hop that lights new stones from lit ones. Walk the stones backwards, so one number is never used twice.",
  metaphor: {
    name: "The stepping stones",
    legend: "stone s = reachable[s] · lit = true · a hop = one number x, from stone sum - x to stone sum · the last stone = target = total / 2",
    terms: ["stone", "hop", "lit", "dark"],
  },
  traps: [{ name: "The Used Twice Trap", rule: "Walking the sums forwards lets a stone just lit by x be hopped from again by the same x. Walk sum from target down to x, so each number is used once at most." }],
  template: [
    "if (total is odd) return false;",
    "ok[0] = true;",
    "for (each item x)                      // each item once",
    "    for (s = target; s >= x; s--)      // backwards",
    "        if (ok[s - x]) ok[s] = true;",
    "return ok[target];",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n · target)",
    timeWhy: "each of the n numbers walks back over at most target stones",
    space: "O(target)",
    spaceWhy: "one yes or no per stone, 0 to target",
  },
  code: CODE,
  examples: [
    { label: "[1,5,11,5]", input: "nums=[1,5,11,5]", expected: "true" },
    { label: "[2,2,3,5]", input: "nums=[2,2,3,5]", expected: "false", note: "Walking forwards would wrongly say true" },
    { label: "[1,2,3,5]", input: "nums=[1,2,3,5]", expected: "false", note: "An odd total: no work needed" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-322", title: "Coin Change" },
    { slug: "lc-139", title: "Word Break" },
    { slug: "lc-198", title: "House Robber" },
  ],
  answer: (raw) => String(canSplit(parseInput(raw))),
  frames: (raw) => {
    const nums = parseInput(raw);
    const table = fill(nums);
    const practice = parseInput(PRACTICE);
    return [
      ...pictureFrames(nums, table),
      ...slowFrames(nums, runSlow(nums)),
      ...insightFrames(nums, table),
      ...walkFrames(nums, table, "solution", false),
      ...walkFrames(practice, fill(practice), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: finished(nums, table),
      },
    ];
  },
  View: AgyDp2StonesView,
};
