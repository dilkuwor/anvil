import {
  AgyChoicesTreeView,
  ChoiceWalk,
  bagWords,
  countWords,
  listText,
  nextForkQuiz,
  stepBackQuiz,
  trapPicture,
  wordList,
  type ChoiceChip,
  type ChoiceTreeState,
} from "../agy-choices-tree-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ChoiceTreeState>;

/** Fresh items for the "your turn" run. The very first fork may be taken twice, so it reaches the trap. */
const PRACTICE = "[3,4,5]; target=8";
const FALLBACK: Query = { items: [2, 3, 5], target: 7 };

const TRAP = "The One Use Trap";

const CODE = [
  "List<List<Integer>> combinationSum(int[] candidates, int target) {",
  "    Arrays.sort(candidates);",
  "    List<List<Integer>> out = new ArrayList<>();",
  "    build(candidates, target, 0, new ArrayDeque<>(), out);",
  "    return out;",
  "}",
  "",
  "void build(int[] candidates, int remaining, int start, Deque<Integer> path, List<List<Integer>> out) {",
  "    if (remaining == 0) {",
  "        out.add(new ArrayList<>(path));",
  "        return;",
  "    }",
  "    for (int i = start; i < candidates.length; i++) {",
  "        if (candidates[i] > remaining) break;",
  "        path.addLast(candidates[i]);",
  "        build(candidates, remaining - candidates[i], i, path, out);",
  "        path.removeLast();",
  "    }",
  "}",
];

type Query = { items: number[]; target: number };

/** "[2,3,5]; target=7". At most three different items and a path of at most four, so the picture fits. */
function readQuery(input: string): Query {
  const [listPart = "", rest = ""] = input.split(";");
  const found = (listPart.match(/\d+/g) ?? []).map(Number).filter((value) => value > 0);
  const items = found.filter((value, index) => found.indexOf(value) === index).slice(0, 3);
  const target = Number(rest.match(/\d+/)?.[0] ?? Number.NaN);
  if (items.length === 0 || !Number.isFinite(target) || target < 1 || Math.floor(target / Math.min(...items)) > 4) return FALLBACK;
  return { items, target };
}

function inOrder(items: number[]): number[] {
  return [...items].sort((a, b) => a - b);
}

/**
 * Independent solver: no walking. Count upwards like a mileage counter, "how many of each item",
 * keep the counts that weigh exactly the target, and put the bags in dictionary order.
 */
function solve({ items, target }: Query): number[][] {
  const sorted = inOrder(items);
  const limits = sorted.map((item) => Math.floor(target / item));
  const counts = sorted.map(() => 0);
  const bags: number[][] = [];
  for (;;) {
    const weight = counts.reduce((sum, count, index) => sum + count * sorted[index], 0);
    if (weight === target) bags.push(sorted.flatMap((item, index) => Array.from({ length: counts[index] }, () => item)));
    let wheel = sorted.length - 1;
    while (wheel >= 0 && counts[wheel] === limits[wheel]) counts[wheel--] = 0;
    if (wheel < 0) break;
    counts[wheel]++;
  }
  const order = (a: number[], b: number[]) => {
    for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) return a[k] - b[k];
    return a.length - b.length;
  };
  return bags.sort(order);
}

function answerText(query: Query): string {
  return listText(solve(query).map(listText));
}

/** The mistake, really run: after taking an item, the forks start at the NEXT item, so nothing is taken twice. */
function oneUseLines({ items, target }: Query): string[] {
  const sorted = inOrder(items);
  const out: string[] = [];
  const path: number[] = [];
  const build = (remaining: number, start: number) => {
    if (remaining === 0) {
      out.push(listText(path));
      return;
    }
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break;
      path.push(sorted[i]);
      build(remaining - sorted[i], i + 1);
      path.pop();
    }
  };
  build(target, 0);
  return out;
}

type Kind = "start" | "sort" | "forks" | "choose" | "write" | "heavy" | "unchoose";

type Moment = {
  kind: Kind;
  state: ChoiceTreeState;
  /** Which fork at the start this moment lies under. -1 = before any fork. */
  branch: number;
  item: string;
  bag: string;
  /** Room left in the bag at this moment. */
  room: number;
  forks: number[];
  /** For "heavy": every fork of the spot was too heavy, so the path ends. */
  all: boolean;
  /** For "forks": the first fork carries the item that was just put in the bag. */
  again: boolean;
  next: number | null;
  nextHeavy: boolean;
  here: number;
};

/** The real algorithm, run once. Every change becomes a moment with a copy of the picture. */
function record(query: Query): { moments: Moment[]; walk: ChoiceWalk; sorted: number[] } {
  const sorted = inOrder(query.items);
  let from = 0;
  let lined = false;
  let room = query.target;
  const walk = new ChoiceWalk(() => ({
    label: "items",
    items: (lined ? sorted : query.items).map((value, index): ChoiceChip => ({ text: String(value), tone: lined && index < from ? "faded" : "idle" })),
  }));
  const moments: Moment[] = [];
  const note = (kind: Kind, branch: number, more: Partial<Moment> = {}) =>
    moments.push({
      kind,
      branch,
      item: "",
      forks: [],
      all: false,
      again: false,
      next: null,
      nextHeavy: false,
      here: walk.here,
      room,
      bag: listText(walk.bag),
      state: walk.snap({ note: { text: `room left: ${room}`, tone: "accent" } }),
      ...more,
    });

  const build = (start: number, branch: number) => {
    from = start;
    if (room === 0) {
      walk.write(listText(walk.bag));
      note("write", branch);
      return;
    }
    const forks = walk.forks(sorted.slice(start).map(String));
    note("forks", branch, { forks, again: walk.bag.length > 0 && walk.bag[walk.bag.length - 1] === String(sorted[start]) });
    for (let i = start; i < sorted.length; i++) {
      const under = branch < 0 ? i : branch;
      if (sorted[i] > room) {
        // Sorted, so every later fork is heavier still: stop looking at this spot.
        walk.skip(forks.slice(i - start), "too heavy");
        note("heavy", under, { item: String(sorted[i]), forks: forks.slice(i - start), all: i === start });
        break;
      }
      walk.choose(forks[i - start]);
      room -= sorted[i];
      note("choose", under, { item: String(sorted[i]) });
      build(i, under);
      const item = walk.unchoose();
      room += sorted[i];
      from = start;
      note("unchoose", under, { item, next: forks[i - start + 1] ?? null, nextHeavy: i + 1 < sorted.length && sorted[i + 1] > room });
    }
  };

  note("start", -1);
  lined = true;
  note("sort", -1);
  build(0, -1);
  return { moments, walk, sorted };
}

function backQuiz(state: ChoiceTreeState): StoryQuiz {
  const items = state.bag.map((chip) => chip.text);
  return stepBackQuiz(listText(items.slice(0, -1)), listText(items), "[]");
}

function againQuiz(item: string, later: string[]): StoryQuiz {
  return {
    kind: "choice",
    question: `The walker has just put a ${item} in the bag. Where do the forks of the next spot begin?`,
    options: [`At ${item} again: it may go in a second time`, later.length > 0 ? `At ${later[0]}: the ${item} has been used` : `Nowhere: the ${item} has been used`],
    answer: 0,
    why: `The shelf never runs out, so the same item may be taken again. The forks begin at the item just taken, never before it.`,
  };
}

function heavyQuiz(room: number, texts: string[]): StoryQuiz {
  return {
    kind: "choice",
    question: `Room left is ${room}. The forks here would be ${wordList(texts)}, lightest first. What does the walker do?`,
    options: [`Steps back: ${texts[0]} does not fit, so nothing after it can`, texts.length > 1 ? `Tries ${wordList(texts.slice(1))} as well, to be sure` : `Takes ${texts[0]} anyway`],
    answer: 0,
    why: "The items are in order of weight. When the lightest fork is too heavy, every fork after it is too heavy as well.",
  };
}

/** The One Use Trap, drawn: the fork that repeats the item, in coral, and the bags that would be lost without it. */
function trapState(state: ChoiceTreeState, fork: number, query: Query): { state: ChoiceTreeState; lost: string[] } {
  const kept = oneUseLines(query);
  const lost = solve(query).map(listText).filter((line) => !kept.includes(line));
  return {
    state: trapPicture(state, fork, "the same item again", { notebook: { label: "careless", items: lost.map((text) => ({ text, tone: "miss" as const, note: "lost" })) }, note: { text: "a walker who uses each item once", tone: "coral" } }),
    lost,
  };
}

function solutionFrames(query: Query, moments: Moment[], walk: ChoiceWalk, sorted: number[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const { target } = query;
  let askedAgain = false;
  let askedHeavy = false;
  let askedBack = false;
  let askedNext = false;
  let forkFrames = 0;
  let writes = 0;

  const firstBack = moments.findIndex((moment) => moment.kind === "unchoose" && moment.here === 0);
  const detailed = moments.slice(0, firstBack + 1);
  const rest = moments.slice(firstBack + 1);

  detailed.forEach((moment, index) => {
    const before = detailed[index - 1];
    const after = detailed[index + 1];
    const { state, bag, item, room } = moment;
    switch (moment.kind) {
      case "start":
        frames.push({ scene, caption: `The walker stands at the start of the path with an empty bag. The bag must end up weighing exactly ${target}, so the room left is ${target}.`, codeLine: 3, state });
        break;
      case "sort":
        frames.push({ scene, caption: `First the items are lined up by weight, lightest first: ${wordList(sorted)}. That will let the walker stop early at a fork that is too heavy.`, codeLine: 1, state });
        break;
      case "forks": {
        const texts = moment.forks.map((fork) => state.nodes[fork].text);
        if (after?.kind === "heavy" && after.all) break;
        if (moment.here === 0) {
          frames.push({ scene, caption: `${countWords(texts.length, "fork leaves", "forks leave")} the start, one for each item: ${wordList(texts)}. They are dotted: not walked yet.`, codeLine: 12, state });
        } else if (moment.again && frames[frames.length - 1]?.quiz?.question.includes("Where do the forks")) {
          const lost = trapState(state, moment.forks[0], query);
          frames.push({ scene, caption: `The forks begin at ${texts[0]} again, because the shelf never runs out. They never go back before ${texts[0]}: that would only repeat a bag in another order.`, codeLine: 15, state });
          frames.push({
            scene,
            caption:
              lost.lost.length > 0
                ? `${TRAP}. A walker who begins the forks after ${texts[0]} can never take it twice. The ${lost.lost.length === 1 ? "answer" : "answers"} ${wordList(lost.lost)} would be lost.`
                : `${TRAP}. A walker who begins the forks after ${texts[0]} can never take it twice, so a bag like ${listText([texts[0], texts[0]])} would never be tried.`,
            codeLine: 15,
            state: lost.state,
          });
        } else if (forkFrames++ < 1) {
          frames.push({ scene, caption: `Again the forks begin at the item just taken: ${wordList(texts)}.`, codeLine: 12, state });
        }
        break;
      }
      case "choose": {
        const closes = after?.kind === "write";
        const frame: Frame = {
          scene,
          caption: closes && writes > 0 ? `The walker takes the fork ${item}. Room left is ${room}: the bag ${bag} weighs exactly ${target}.` : `The walker takes the fork ${item} and puts ${item} in the bag. Room left is ${room}.`,
          codeLine: 14,
          state,
        };
        if (!askedAgain && after?.kind === "forks" && after.again) {
          askedAgain = true;
          frame.quiz = againQuiz(item, sorted.filter((value) => value > Number(item)).map(String));
        } else if (!askedHeavy && after?.kind === "forks" && detailed[index + 2]?.kind === "heavy" && detailed[index + 2].all) {
          askedHeavy = true;
          frame.quiz = heavyQuiz(room, after.forks.map((fork) => after.state.nodes[fork].text));
        }
        frames.push(frame);
        break;
      }
      case "write": {
        const frame: Frame = {
          scene,
          caption: writes === 0 ? `Room left is 0: the bag weighs exactly ${target}. The walker writes a copy in the notebook: ${bag}. The path ends here.` : `The walker writes a copy of the bag in the notebook: ${bag}. The path ends here.`,
          codeLine: 9,
          state,
        };
        writes++;
        if (!askedBack) {
          askedBack = true;
          frame.quiz = backQuiz(state);
        }
        frames.push(frame);
        break;
      }
      case "heavy": {
        const texts = moment.forks.map((fork) => state.nodes[fork].text);
        const others = texts.slice(1);
        frames.push({
          scene,
          caption: moment.all
            ? `Room left is ${room}. Even the lightest fork here, ${item}, is too heavy${others.length > 0 ? `, and ${wordList(others)} ${others.length === 1 ? "is" : "are"} heavier still` : ""}. The path ends without an answer.`
            : `The next fork is ${item}, but the room left is ${room}. Too heavy${others.length > 0 ? `, and so is every fork after it` : ""}. The walker stops looking at this spot.`,
          codeLine: 13,
          state,
        });
        break;
      }
      case "unchoose": {
        const again = before?.kind === "unchoose" || (before?.kind === "heavy" && !before.all);
        const frame: Frame = {
          scene,
          caption: again
            ? `No fork is left at this spot. The walker steps back again and takes ${item} out. The bag is ${bagWords(bag)}, and the room left is ${room}.`
            : `The walker steps back one spot and takes ${item} out of the bag. The bag is ${bagWords(bag)}, and the room left is ${room} again.`,
          codeLine: 16,
          state,
        };
        if (!askedNext && moment.next !== null && !moment.nextHeavy) {
          askedNext = true;
          frame.quiz = nextForkQuiz(state, moment.here, moment.next);
        }
        frames.push(frame);
        break;
      }
    }
  });

  const branches = [...new Set(rest.map((moment) => moment.branch))];
  for (const branch of branches) {
    const inside = rest.filter((moment) => moment.branch === branch);
    const last = inside[inside.length - 1];
    const name = String(sorted[branch]);
    if (inside.length === 1 && last.kind === "heavy") {
      frames.push({ scene, caption: `The next fork at the start is ${name}, heavier than the whole target of ${target}. It is crossed out, with every fork after it.`, codeLine: 13, state: last.state });
      continue;
    }
    const lines = inside.filter((moment) => moment.kind === "write").map((moment) => moment.bag);
    const dead = inside.filter((moment) => moment.kind === "heavy").length;
    frames.push({
      scene,
      caption:
        lines.length > 0
          ? `Down the fork ${name} the forks begin at ${name}, never back at a lighter item. The walker writes ${wordList(lines)}, and empties the bag on the way back.`
          : `Down the fork ${name} the forks begin at ${name}. ${countWords(dead, "spot runs", "spots run")} into a fork that is too heavy, and nothing is written.`,
      codeLine: 15,
      state: last.state,
    });
  }

  const spots = moments.filter((moment) => moment.kind === "choose").length + 1;
  const fullest = Math.max(...moments.map((moment) => moment.state.bag.length));
  const deepest = moments.find((moment) => moment.state.bag.length === fullest);
  const lightest = sorted[0];
  frames.push({ scene, caption: `Every fork has been walked or crossed out, and the bag is empty. The answer is ${answerText(query)}.`, codeLine: 4, state: walk.finished({ note: null }) });
  frames.push({
    scene,
    caption: `Time: O(N^(target / min)). Up to N forks leave each spot, and a path is never longer than ${target} / ${lightest} items. Crossing out heavy forks kept this walk to ${spots} spots.`,
    codeLine: 13,
    state: walk.finished({ note: null, counter: { label: "spots walked", value: spots } }),
  });
  frames.push({
    scene,
    caption: `Space: O(target / min). Apart from the notebook there is one bag. With the lightest item weighing ${lightest}, it never held more than ${fullest} items.`,
    codeLine: 14,
    state: walk.finished({ bag: (deepest?.state.bag ?? []).map((chip) => ({ ...chip, tone: "hit" as const })), note: { text: "the bag at its fullest", tone: "teal" } }),
  });
  return frames;
}

/** The practice run: the same real walk on fresh items, told briefly. The reader makes each decision. */
function practiceFrames(query: Query): Frame[] {
  const scene: SceneId = "card";
  const { moments, walk, sorted } = record(query);
  const frames: Frame[] = [];
  const firstBack = moments.findIndex((moment) => moment.kind === "unchoose" && moment.here === 0);
  const detailed = moments.slice(0, firstBack + 1);
  const rest = moments.slice(firstBack + 1);
  let shownTrap = false;

  detailed.forEach((moment, index) => {
    const after = detailed[index + 1];
    const { state, bag, item, room } = moment;
    if (moment.kind === "forks" && moment.here === 0) {
      frames.push({ scene, caption: `Your turn. The items are ${wordList(sorted)}, and the bag must weigh exactly ${query.target}. The walker stands at the start.`, state });
    } else if (moment.kind === "forks" && moment.again && !shownTrap) {
      shownTrap = true;
      const texts = moment.forks.map((fork) => state.nodes[fork].text);
      const trap = trapState(state, moment.forks[0], query);
      frames.push({ scene, caption: `The forks begin at ${texts[0]} again: ${wordList(texts)}.`, state });
      frames.push({
        scene,
        caption: `Beginning after ${texts[0]} is ${TRAP.replace(/^The /, "the ")}: no item could go in twice${trap.lost.length > 0 ? `, and ${wordList(trap.lost)} would be lost` : ""}.`,
        state: trap.state,
      });
    } else if (moment.kind === "choose") {
      const frame: Frame = { scene, caption: `The walker takes the fork ${item}. The bag is ${bag}, and the room left is ${room}.`, state };
      if (after?.kind === "forks" && after.again && !shownTrap) frame.quiz = againQuiz(item, sorted.filter((value) => value > Number(item)).map(String));
      else if (after?.kind === "forks" && detailed[index + 2]?.kind === "heavy" && detailed[index + 2].all) frame.quiz = heavyQuiz(room, after.forks.map((fork) => after.state.nodes[fork].text));
      frames.push(frame);
    } else if (moment.kind === "write") {
      frames.push({ scene, caption: `Room left is 0, so the walker writes ${bag} in the notebook. The path ends.`, state, quiz: backQuiz(state) });
    } else if (moment.kind === "heavy") {
      frames.push({
        scene,
        caption: moment.all ? `Even the lightest fork, ${item}, does not fit in a room of ${room}. The path ends without an answer.` : `The next fork, ${item}, does not fit in a room of ${room}. It is crossed out, with every fork after it.`,
        state,
      });
    } else if (moment.kind === "unchoose") {
      const frame: Frame = { scene, caption: `The walker steps back and takes ${item} out of the bag. The bag is ${bagWords(bag)}, and the room left is ${room}.`, state };
      if (moment.next !== null && !moment.nextHeavy) frame.quiz = nextForkQuiz(state, moment.here, moment.next);
      frames.push(frame);
    }
  });

  const firstChoice = rest.find((moment) => moment.kind === "choose");
  const lines = rest.filter((moment) => moment.kind === "write").map((moment) => moment.bag);
  if (firstChoice) frames.push({ scene, caption: `The walker takes the fork ${firstChoice.item} at the start. The room left is ${firstChoice.room}.`, state: firstChoice.state });
  if (rest.length > 0) {
    frames.push({
      scene,
      caption: lines.length > 0 ? `The rest of the walk goes the same way. It adds ${wordList(lines)}, and crosses out every fork that is too heavy.` : "The rest of the walk goes the same way. It only runs into forks that are too heavy, and adds nothing.",
      state: rest[rest.length - 1].state,
    });
  }
  const found = moments.filter((moment) => moment.kind === "write").length;
  frames.push({ scene, caption: `Done. The notebook holds ${found === 1 ? "the one bag" : `all ${found} bags`} that weigh exactly ${query.target}. You let an item go in again, and stopped at the first heavy fork.`, state: walk.finished({ note: null }) });
  return frames;
}

function weigh(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}

function pictureFrames(query: Query, walk: ChoiceWalk): Frame[] {
  const sorted = inOrder(query.items);
  const { target } = query;
  const answers = solve(query);
  const shelf = { label: "items", items: query.items.map((value): ChoiceChip => ({ text: String(value), tone: "idle" })) };
  const goal = { text: `the bag must weigh ${target}`, tone: "accent" as const };
  const light = sorted[0];
  const heavyBag = Array.from({ length: Math.floor(target / light) + 1 }, () => light);
  const lightBag = heavyBag.slice(0, -1);
  const sample = answers[0] ?? null;
  const allowed = sample ? { label: "allowed", items: [{ text: listText(sample), tone: "done" as const }] } : { label: "too light", items: [{ text: listText(lightBag), tone: "miss" as const }] };
  const repeats = sample !== null && new Set(sample).size < sample.length;
  return [
    { scene: "picture", caption: `These are the items: ${wordList(query.items)}. Think of each number as a weight. The bag must weigh exactly ${target}.`, state: walk.plain([], { shelf, note: goal }) },
    {
      scene: "picture",
      caption: sample
        ? `${listText(sample)} weighs ${weigh(sample)}, so it is allowed. ${repeats ? "An item may be used again and again: the shelf never runs out." : "An item could also be used more than once: the shelf never runs out."}`
        : `${listText(lightBag)} weighs ${weigh(lightBag)}: too light. An item may be used again and again, but it does not help here.`,
      state: walk.plain([allowed], { shelf, note: goal }),
    },
    {
      scene: "picture",
      caption: `${listText(heavyBag)} weighs ${weigh(heavyBag)}: too heavy, so it is not allowed. Nothing can be taken out of a bag to fix it.`,
      state: walk.plain([allowed, { label: "too heavy", items: [{ text: listText(heavyBag), tone: "miss" as const }] }], { shelf, note: goal }),
    },
    {
      scene: "picture",
      caption:
        answers.length > 0
          ? `The goal: list every bag that weighs exactly ${target}, each group once. The order inside a bag does not matter. Here there ${answers.length === 1 ? "is 1" : `are ${answers.length}`}.`
          : `The goal: list every bag that weighs exactly ${target}, each group once. Here there is none, so the list stays empty.`,
      state: walk.plain(answers.length > 0 ? [{ label: "the goal", items: answers.map((bag) => ({ text: listText(bag), tone: "hit" as const })) }] : [{ label: "the goal", items: [] }], { shelf, note: goal }),
    },
  ];
}

/** The slow way, really run: one yes-or-no question per call ("take this item again, or leave it for good?"). */
function slowFrames(query: Query, walk: ChoiceWalk, spots: number): Frame[] {
  const sorted = inOrder(query.items);
  let questions = 0;
  let found = 0;
  const ask = (remaining: number, index: number) => {
    questions++;
    if (remaining === 0) {
      found++;
      return;
    }
    if (index === sorted.length || sorted[index] > remaining) return;
    ask(remaining - sorted[index], index);
    ask(remaining, index + 1);
  };
  ask(query.target, 0);
  const first = String(sorted[0]);
  const question = { label: "question", items: [{ text: `take ${first} again`, tone: "window" as const }, { text: `leave ${first} for good`, tone: "window" as const }] };
  const counter = { label: "questions asked", value: questions };
  return [
    { scene: "slow", caption: `The slow way asks one small question at a time: take ${first} again, or leave ${first} for good? Each answer opens a new question.`, state: walk.plain([question], { counter: { label: "questions asked", value: 1 } }) },
    {
      scene: "slow",
      caption: `Every question splits in two, so they pile up. Here it takes ${questions} questions to find ${found === 1 ? "1 bag" : `${found} bags`}.`,
      state: walk.plain([question], { counter }),
    },
    {
      scene: "slow",
      caption: `Two ways at every question is O(2^(target / min)) questions. The walker will look at whole forks instead, and visit only ${spots} spots.`,
      state: walk.plain([{ ...question, items: question.items.map((chip) => ({ ...chip, tone: "faded" as const })) }], { counter }),
    },
  ];
}

function insightFrames(query: Query, moments: Moment[]): Frame[] {
  const twice = moments.find((moment) => moment.kind === "choose" && moment.state.bag.length === 2);
  const heavy = moments.find((moment) => moment.kind === "heavy");
  const back = heavy ? moments.slice(moments.indexOf(heavy) + 1).find((moment) => moment.kind === "unchoose") : undefined;
  if (!twice || !heavy || !back) return [];
  return [
    { scene: "insight", caption: `Picture a walker on a branching path, with a bag that must weigh exactly ${query.target}. At each fork one item goes in the bag, and the room left shrinks.`, state: twice.state },
    { scene: "insight", caption: `When the room left is ${heavy.room} and the next fork is ${heavy.item}, it is too heavy. The forks are in order of weight, so the walker stops looking there.`, state: heavy.state },
    { scene: "insight", caption: `Then the walker steps back one spot and takes ${back.item} out of the bag. There is room again. Choose, walk on, un-choose.`, state: back.state },
  ];
}

export const combinationSumStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-39"],
  pattern: "Backtracking",
  trigger: "“all unique combinations that sum to a target”, and a number may be used any number of times",
  insight: "A walker filling a bag to an exact weight. The forks begin at the item just taken, so it may go in again. Lightest first: at the first fork that is too heavy, stop looking.",
  metaphor: {
    name: "The path of choices",
    legend: "bag = path · room left = remaining · forks = the loop from start · same item again = recurse with i · too heavy = break",
    terms: ["walker", "bag", "fork", "notebook", "room left", "spot"],
  },
  traps: [{ name: TRAP, rule: "Walk on with i, not i + 1: the forks of the next spot begin at the item just taken, so it can be taken again." }],
  template: [
    "sort the items;",
    "walk(room, start, bag):",
    "    if (room == 0) { write down a copy; return; }",
    "    for each position i from start onward:",
    "        if (item i > room) stop looking;        // sorted: the rest is heavier",
    "        put item in bag;  walk(room - item, i, bag);  take item out;",
  ],
  complexity: {
    slow: "O(2^(target / min))",
    time: "O(N^(target / min))",
    timeWhy: "up to N forks leave each spot, and a path holds at most target / min items; heavy forks are crossed out at once",
    space: "O(target / min)",
    spaceWhy: "one bag and one path, never longer than target divided by the lightest item",
  },
  code: CODE,
  examples: [
    { label: "[2,3,5], 7", input: "[2,3,5]; target=7", expected: "[[2,2,3],[2,5]]" },
    { label: "[3,2], 6", input: "[3,2]; target=6", expected: "[[2,2,2],[3,3]]", note: "Not in order yet" },
    { label: "[2,4], 5", input: "[2,4]; target=5", expected: "[]", note: "No bag fits" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-78", title: "Subsets" },
    { slug: "lc-90", title: "Subsets II" },
    { slug: "lc-46", title: "Permutations" },
  ],
  answer: (input) => answerText(readQuery(input)),
  frames: (input) => {
    const query = readQuery(input);
    const { moments, walk, sorted } = record(query);
    const spots = moments.filter((moment) => moment.kind === "choose").length + 1;
    return [
      ...pictureFrames(query, walk),
      ...slowFrames(query, walk, spots),
      ...insightFrames(query, moments),
      ...solutionFrames(query, moments, walk, sorted),
      ...practiceFrames(readQuery(PRACTICE)),
      { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: walk.finished({ note: null }) },
    ];
  },
  View: AgyChoicesTreeView,
};
