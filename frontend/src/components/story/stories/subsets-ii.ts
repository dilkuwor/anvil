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

/** Fresh items for the "your turn" run: the twins come first, so the trap arrives at the first fork. */
const PRACTICE = "[4,4,5]";
const FALLBACK = [1, 2, 2];

const TRAP = "The Twin Trap";

const CODE = [
  "List<List<Integer>> subsetsWithDup(int[] nums) {",
  "    Arrays.sort(nums);",
  "    List<List<Integer>> out = new ArrayList<>();",
  "    build(nums, 0, new ArrayList<>(), out);",
  "    return out;",
  "}",
  "",
  "void build(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {",
  "    out.add(new ArrayList<>(path));",
  "    for (int i = start; i < nums.length; i++) {",
  "        if (i > start && nums[i] == nums[i - 1]) continue;",
  "        path.add(nums[i]);",
  "        build(nums, i + 1, path, out);",
  "        path.remove(path.size() - 1);",
  "    }",
  "}",
];

/** "[1,2,2]" → [1,2,2]. At most four items, so the path always fits the picture. */
function readItems(input: string): number[] {
  const items = (input.match(/-?\d+/g) ?? []).map(Number).slice(0, 4);
  return items.length > 0 ? items : FALLBACK;
}

function inOrder(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}

/**
 * Independent solver: no walking. Every number from 0 to 2^n - 1 picks one group; equal groups are
 * kept once (by their text), and the groups are put in dictionary order.
 */
function solve(nums: number[]): number[][] {
  const sorted = inOrder(nums);
  const seen = new Map<string, number[]>();
  for (let mask = 0; mask < 1 << sorted.length; mask++) {
    const group = sorted.filter((_, index) => (mask >> index) & 1);
    seen.set(listText(group), group);
  }
  const order = (a: number[], b: number[]) => {
    for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) return a[k] - b[k];
    return a.length - b.length;
  };
  return [...seen.values()].sort(order);
}

function answerText(nums: number[]): string {
  return listText(solve(nums).map(listText));
}

/** The mistake, really run: skip every twin, even the first fork of a spot. Returns what it would write. */
function carelessLines(sorted: number[]): string[] {
  const out: string[] = [];
  const path: number[] = [];
  const build = (start: number) => {
    out.push(listText(path));
    for (let i = start; i < sorted.length; i++) {
      if (i > 0 && sorted[i] === sorted[i - 1]) continue;
      path.push(sorted[i]);
      build(i + 1);
      path.pop();
    }
  };
  build(0);
  return out;
}

type Kind = "start" | "sort" | "write" | "forks" | "end" | "twin" | "choose" | "unchoose" | "skip";

type Moment = {
  kind: Kind;
  state: ChoiceTreeState;
  /** Which fork at the start this moment lies under. -1 = before any fork. */
  branch: number;
  item: string;
  bag: string;
  forks: number[];
  /** After a step back: the next fork at this spot, walked or skipped. */
  next: number | null;
  /** That next fork carries the same item as the one just walked. */
  nextIsTwin: boolean;
  /** The fork this moment is about. */
  fork: number;
  here: number;
};

/** The real algorithm, run once. Every change becomes a moment with a copy of the picture. */
function record(nums: number[]): { moments: Moment[]; walk: ChoiceWalk; sorted: number[] } {
  const sorted = inOrder(nums);
  let from = 0;
  let lined = false;
  const chosen: number[] = [];
  const walk = new ChoiceWalk(() => ({
    label: "items",
    items: (lined ? sorted : nums).map((value, index): ChoiceChip => ({ text: String(value), tone: chosen.includes(index) ? "window" : lined && index < from ? "faded" : "idle" })),
  }));
  const moments: Moment[] = [];
  const note = (kind: Kind, branch: number, more: Partial<Moment> = {}) =>
    moments.push({ kind, branch, item: "", forks: [], next: null, nextIsTwin: false, fork: -1, here: walk.here, bag: listText(walk.bag), state: walk.snap(), ...more });

  const build = (start: number, branch: number) => {
    from = start;
    walk.write(listText(walk.bag));
    note("write", branch);
    const forks = walk.forks(sorted.slice(start).map(String));
    note(forks.length > 0 ? "forks" : "end", branch, { forks });
    for (let i = start; i < sorted.length; i++) {
      const fork = forks[i - start];
      const under = branch < 0 ? i : branch;
      if (i > start && sorted[i] === sorted[i - 1]) {
        walk.skip([fork], `same as the ${sorted[i]} before`);
        note("skip", under, { item: String(sorted[i]), fork });
        continue;
      }
      // The first fork of a spot is always walked, even when it is a twin of the item just put in the bag.
      if (i > 0 && sorted[i] === sorted[i - 1]) note("twin", under, { item: String(sorted[i]), fork });
      walk.choose(fork);
      chosen.push(i);
      from = i + 1;
      note("choose", under, { item: String(sorted[i]), fork });
      build(i + 1, under);
      const item = walk.unchoose();
      chosen.pop();
      from = start;
      note("unchoose", under, { item, fork, next: forks[i - start + 1] ?? null, nextIsTwin: i + 1 < sorted.length && sorted[i + 1] === sorted[i] });
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

function twinWalkQuiz(item: string): StoryQuiz {
  return {
    kind: "choice",
    question: `The first fork at this spot is a ${item}, and a ${item} is already in the bag. Does the walker take it?`,
    options: [`Yes, take it`, `No, skip it`],
    answer: 0,
    why: `A bag with both twins in it is a new list. A twin may follow its twin down the path.`,
  };
}

function skipQuiz(item: string): StoryQuiz {
  return {
    kind: "choice",
    question: `The next fork at this same spot is another ${item}. The walker has just come back from a ${item} here. Take it or skip it?`,
    options: ["Skip it", "Take it"],
    answer: 0,
    why: `It would put ${item} in the same bag again, so every list down that fork is already in the notebook.`,
  };
}

/** The Twin Trap, drawn: the deeper twin fork that a careless rule would skip, and the lists that would be lost. */
function trapFrameState(state: ChoiceTreeState, twinFork: number, sorted: number[]): { state: ChoiceTreeState; lost: string[] } {
  const kept = new Set(carelessLines(sorted));
  const lost = solve(sorted).map(listText).filter((line) => !kept.has(line));
  const items: ChoiceChip[] = [...state.notebook.items.map((chip) => ({ ...chip, tone: "idle" as const })).filter((chip) => !lost.includes(chip.text)), ...lost.map((text) => ({ text, tone: "miss" as const, note: "lost" }))];
  return { state: trapPicture(state, twinFork, "never skip this one", { notebook: { label: "careless", items }, note: { text: "a rule that skips every twin", tone: "coral" } }), lost };
}

function solutionFrames(nums: number[], moments: Moment[], walk: ChoiceWalk, sorted: number[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  let askedBack = false;
  let askedTwin = false;
  let askedSkip = false;
  let shownTrap = false;
  let revealTwin = false;
  let twinFork: number | null = null;

  // Full detail until the trap has been drawn and the walker is back at the start; after that, one frame per fork.
  const firstBack = moments.findIndex((moment) => moment.kind === "unchoose" && moment.here === 0);
  const detailed = moments.slice(0, firstBack + 1);
  const rest = moments.slice(firstBack + 1);

  detailed.forEach((moment, index) => {
    const before = detailed[index - 1];
    const after = detailed[index + 1];
    const { state, bag, item } = moment;
    switch (moment.kind) {
      case "start":
        frames.push({ scene, caption: "The walker stands at the start of the path. The bag is empty, and so is the notebook.", codeLine: 3, state });
        break;
      case "sort":
        frames.push({
          scene,
          caption:
            listText(nums) === listText(sorted)
              ? `First the items are lined up in order: ${wordList(sorted)}. Equal items, the twins, now stand side by side.`
              : `First the items are lined up in order: ${wordList(sorted)}. Now equal items, the twins, stand side by side.`,
          codeLine: 1,
          state,
        });
        break;
      case "write": {
        const closes = after?.kind === "end" ? " No fork leaves this spot: the path ends here." : "";
        let caption = `The walker writes a copy of the bag in the notebook: ${bag}.${closes}`;
        if (bag === "[]") caption = "The walker writes a copy of the bag in the notebook at every spot. Here the bag is empty, and that is a subset too.";
        else if (revealTwin) caption = `A twin may follow its twin down the path. The bag ${bag} is a new list, so the walker writes it.${closes}`;
        revealTwin = false;
        const frame: Frame = { scene, caption, codeLine: 8, state };
        if (closes && !askedBack) {
          askedBack = true;
          frame.quiz = backQuiz(state);
        }
        frames.push(frame);
        break;
      }
      case "forks": {
        const texts = moment.forks.map((fork) => state.nodes[fork].text);
        if (after?.kind === "twin") break;
        frames.push({
          scene,
          caption:
            moment.here === 0
              ? `${countWords(texts.length, "fork leaves", "forks leave")} the start, one for each item: ${wordList(texts)}. They are dotted: not walked yet.`
              : `Forks only lead forward, to later items. ${countWords(texts.length, "fork leaves", "forks leave")} this spot: ${wordList(texts)}.`,
          codeLine: 9,
          state,
        });
        break;
      }
      case "twin": {
        twinFork ??= moment.fork;
        const frame: Frame = { scene, caption: (before?.forks.length ?? 1) === 1 ? `One fork leaves this spot: a ${item}, the twin of the ${item} in the bag.` : `${countWords(before?.forks.length ?? 2, "fork leaves", "forks leave")} this spot. The first is a ${item}, the twin of the ${item} in the bag.`, codeLine: 10, state };
        if (!askedTwin) {
          askedTwin = true;
          frame.quiz = twinWalkQuiz(item);
        }
        revealTwin = true;
        frames.push(frame);
        break;
      }
      case "end":
        break;
      case "choose":
        frames.push({ scene, caption: `The walker takes the fork ${item} and puts ${item} in the bag.`, codeLine: 11, state });
        break;
      case "unchoose": {
        const again = before?.kind === "unchoose" || before?.kind === "skip";
        const frame: Frame = {
          scene,
          caption: again
            ? `No fork is left at this spot. The walker steps back again and takes ${item} out of the bag. The bag is ${bagWords(bag)}.`
            : `The walker steps back one spot and takes ${item} out of the bag. The bag is ${bagWords(bag)} again.`,
          codeLine: 13,
          state,
        };
        if (moment.nextIsTwin && !askedSkip) {
          askedSkip = true;
          frame.quiz = skipQuiz(item);
        }
        frames.push(frame);
        break;
      }
      case "skip": {
        frames.push({
          scene,
          caption: `The walker skips it. Same spot, same item: that fork leads only to lists that are already in the notebook. It is crossed out.`,
          codeLine: 10,
          state,
        });
        if (!shownTrap && twinFork !== null) {
          shownTrap = true;
          const trap = trapFrameState(state, twinFork, sorted);
          frames.push({
            scene,
            caption: `${TRAP}. Only a twin at the same spot is skipped. A rule that also skips the twin further down the path would lose ${wordList(trap.lost)}.`,
            codeLine: 10,
            state: trap.state,
          });
        }
        break;
      }
    }
  });

  // The other forks at the start: really walked (or really skipped), told in one frame each.
  const branches = [...new Set(rest.map((moment) => moment.branch))];
  let skippedBefore = false;
  for (const branch of branches) {
    const inside = rest.filter((moment) => moment.branch === branch);
    const last = inside[inside.length - 1];
    const name = String(sorted[branch]);
    if (inside.length === 1 && last.kind === "skip") {
      frames.push({
        scene,
        caption: skippedBefore
          ? `The fork after it is a ${name} too. It is crossed out for the same reason: same spot, same item.`
          : `The next fork at the start is a ${name} again, a twin of the fork just walked. Same spot, so the walker skips it.`,
        codeLine: 10,
        state: last.state,
      });
      skippedBefore = true;
      continue;
    }
    const lines = inside.filter((moment) => moment.kind === "write").map((moment) => moment.bag);
    const twins = inside.some((moment) => moment.kind === "twin");
    frames.push({
      scene,
      caption: `Down the fork ${name} the walker writes ${wordList(lines)}.${twins ? " The twin further down is walked, as before." : ""} Then the bag is emptied again.`,
      codeLine: 12,
      state: last.state,
    });
  }

  const spots = moments.filter((moment) => moment.kind === "write").length;
  const skipped = moments.filter((moment) => moment.kind === "skip").length;
  const fullest = Math.max(...moments.map((moment) => moment.state.bag.length));
  const deepest = moments.find((moment) => moment.state.bag.length === fullest);
  frames.push({ scene, caption: `Every fork has been walked or crossed out, and the bag is empty. The answer is ${answerText(nums)}.`, codeLine: 4, state: walk.finished() });
  frames.push({
    scene,
    caption: `Time: O(n · 2^n). With no twins, ${nums.length} items would make ${1 << nums.length} spots, each copied into the notebook. Here ${skipped} crossed-out ${skipped === 1 ? "fork" : "forks"} left only ${spots}.`,
    codeLine: 8,
    state: walk.finished({ counter: { label: "spots written", value: spots } }),
  });
  frames.push({
    scene,
    caption: `Space: O(n). Apart from the notebook, the walker carries one bag, never more than ${fullest} items. No list of seen answers is needed.`,
    codeLine: 11,
    state: walk.finished({ bag: (deepest?.state.bag ?? []).map((chip) => ({ ...chip, tone: "hit" as const })), note: { text: "the bag at its fullest", tone: "teal" } }),
  });
  return frames;
}

/** The practice run: the same real walk on fresh items, told briefly. The reader makes each decision. */
function practiceFrames(nums: number[]): Frame[] {
  const scene: SceneId = "card";
  const { moments, walk, sorted } = record(nums);
  const frames: Frame[] = [];
  let twinFork: number | null = null;
  let shownTrap = false;
  let revealTwin = false;

  moments.forEach((moment, index) => {
    const before = moments[index - 1];
    const after = moments[index + 1];
    const { state, bag, item } = moment;
    if (moment.kind === "forks" && moment.here === 0) {
      frames.push({ scene, caption: `Your turn, with new items: ${wordList(sorted)}. They are in order, the empty bag is written down, and the walker stands at the start.`, state });
    } else if (moment.kind === "twin") {
      twinFork ??= moment.fork;
      revealTwin = true;
      frames.push({ scene, caption: `The bag is ${bag}. The first fork at this spot is another ${item}.`, state, quiz: twinWalkQuiz(item) });
    } else if (moment.kind === "write" && bag !== "[]") {
      const ends = after?.kind === "end";
      const frame: Frame = {
        scene,
        caption: revealTwin ? `The walker takes it, and writes the new list ${bag}.` : `The walker takes the fork ${before?.item ?? ""}, and writes ${bag}.${ends ? " The path ends here." : ""}`,
        state,
      };
      revealTwin = false;
      if (ends) frame.quiz = backQuiz(state);
      frames.push(frame);
    } else if (moment.kind === "unchoose") {
      const frame: Frame = { scene, caption: `The walker steps back and takes ${item} out of the bag. The bag is ${bagWords(bag)}.`, state };
      if (moment.nextIsTwin) frame.quiz = skipQuiz(item);
      else if (moment.next !== null) frame.quiz = nextForkQuiz(state, moment.here, moment.next);
      frames.push(frame);
    } else if (moment.kind === "skip") {
      frames.push({ scene, caption: `The walker skips it: same spot, same item. Everything down that fork is already in the notebook.`, state });
      if (!shownTrap && twinFork !== null) {
        shownTrap = true;
        const trap = trapFrameState(state, twinFork, sorted);
        frames.push({ scene, caption: `Beware of ${TRAP.replace(/^The /, "the ")}: skipping the twin further down as well would lose ${wordList(trap.lost)}.`, state: trap.state });
      }
    }
  });

  frames.push({ scene, caption: `Done. The notebook holds all ${moments.filter((moment) => moment.kind === "write").length} subsets, each one once. You skipped a twin only at the same spot.`, state: walk.finished() });
  return frames;
}

function pictureFrames(nums: number[], walk: ChoiceWalk): Frame[] {
  const sorted = inOrder(nums);
  const all = solve(nums).map(listText);
  const twin = sorted.find((value, index) => index > 0 && sorted[index - 1] === value);
  const shelf = { label: "items", items: nums.map((value): ChoiceChip => ({ text: String(value), tone: value === twin ? "window" : "idle" })) };
  const frames: Frame[] = [];
  if (twin === undefined) {
    frames.push({ scene: "picture", caption: `These are the items: ${wordList(nums)}. A subset is any group picked from them. Here no two items are equal.`, state: walk.plain([], { shelf }) });
  } else {
    const other = sorted.find((value) => value !== twin);
    const once = listText(inOrder(other === undefined ? [twin] : [other, twin]));
    const both = { label: "allowed", items: [{ text: listText([twin, twin]), tone: "done" as const }] };
    frames.push({ scene: "picture", caption: `These are the items: ${wordList(nums)}. A subset is any group picked from them. Two items are equal: call them twins.`, state: walk.plain([], { shelf }) });
    frames.push({ scene: "picture", caption: `${listText([twin, twin])} is a subset: both twins may be picked together.`, state: walk.plain([both], { shelf }) });
    frames.push({
      scene: "picture",
      caption: `${once} can be picked in two ways, once with each twin. It may still be listed only once.`,
      state: walk.plain([both, { label: "not allowed", items: [{ text: once, tone: "idle" as const }, { text: once, tone: "miss" as const, note: "again" }] }], { shelf }),
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: list every different subset, each one once. Here there are ${all.length}, and the empty group counts too.`,
    state: walk.plain([{ label: `all ${all.length}`, items: all.map((text) => ({ text, tone: "hit" as const })) }], { shelf: { ...shelf, items: shelf.items.map((chip) => ({ ...chip, tone: "idle" as const })) } }),
  });
  return frames;
}

/** The slow way, really run: walk every fork as if all items were different, then throw the repeats away. */
function slowFrames(nums: number[], walk: ChoiceWalk): Frame[] {
  const sorted = inOrder(nums);
  const made: string[] = [];
  const path: number[] = [];
  const build = (start: number) => {
    made.push(listText(path));
    for (let i = start; i < sorted.length; i++) {
      path.push(sorted[i]);
      build(i + 1);
      path.pop();
    }
  };
  build(0);
  const seen = new Set<string>();
  const repeats = made.map((line) => {
    const again = seen.has(line);
    seen.add(line);
    return again;
  });
  const wasted = repeats.filter(Boolean).length;
  const row = (mark: boolean, faded = false) => [
    { label: "written", items: made.map((text, index): ChoiceChip => ({ text, tone: faded ? "faded" : mark && repeats[index] ? "miss" : "idle", ...(mark && repeats[index] && !faded ? { note: "again" } : {}) })) },
  ];
  return [
    { scene: "slow", caption: "The slow way: treat all items as different. Walk every fork and write down every bag.", state: walk.plain(row(false), { counter: { label: "lists written", value: made.length } }) },
    {
      scene: "slow",
      caption: `Then check each list against all the lists kept so far, and throw away the repeats. Here ${wasted} of the ${made.length} lists ${wasted === 1 ? "is a repeat" : "are repeats"}.`,
      state: walk.plain(row(true), { counter: { label: "lists written", value: made.length } }),
    },
    {
      scene: "slow",
      caption: `Every repeat was walked and written before it was thrown away, and every list had to be kept for checking. That is O(n · 2^n) time, and as much room.`,
      state: walk.plain(row(true, true), { counter: { label: "lists written", value: made.length } }),
    },
  ];
}

function insightFrames(moments: Moment[]): Frame[] {
  const forks = moments.find((moment) => moment.kind === "forks");
  const back = moments.find((moment) => moment.kind === "unchoose" && moment.nextIsTwin);
  const skip = moments.find((moment) => moment.kind === "skip");
  if (!forks || !back || !skip) return [];
  return [
    { scene: "insight", caption: "Picture a walker on a branching path, carrying a bag and a notebook. At each fork they put one item in the bag and walk on. Two forks here are twins.", state: forks.state },
    { scene: "insight", caption: `Later the walker steps back from a fork ${back.item}, and takes ${back.item} out of the bag. The next fork at this same spot is its twin.`, state: back.state },
    { scene: "insight", caption: `The twin would put ${back.item} in the same bag again, and lead to the same lists. So at one spot, the walker skips a fork equal to the one just walked.`, state: skip.state },
  ];
}

export const subsetsIiStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-90"],
  pattern: "Subsets with duplicates",
  trigger: "“return all subsets” when the numbers may contain duplicates",
  insight: "Line the items up so twins stand together. The walker with the bag skips a fork only when it equals the fork just walked at the same spot.",
  metaphor: {
    name: "The path of choices",
    legend: "bag = path · notebook = out · forks = the loop from start · same spot = i > start · twin = nums[i] == nums[i - 1]",
    terms: ["walker", "bag", "fork", "notebook", "spot", "twin"],
  },
  traps: [{ name: TRAP, rule: "Skip a twin only among the forks of one spot: i > start, not i > 0. The first fork of a spot is always walked, or lists like [2,2] are lost." }],
  template: [
    "sort the items;",
    "walk(start, bag):",
    "    write down a copy of bag;",
    "    for each position i from start onward:",
    "        if (i > start and item i equals item i - 1) skip;   // a twin at the same spot",
    "        put item in bag;  walk(i + 1, bag);  take item out;",
  ],
  complexity: {
    slow: "O(n · 2^n)",
    time: "O(n · 2^n)",
    timeWhy: "at most 2^n spots, each copying a bag of up to n items; crossed-out forks are never walked at all",
    space: "O(n)",
    spaceWhy: "one bag and one path, never deeper than n; no set of seen lists",
  },
  code: CODE,
  examples: [
    { label: "[1,2,2]", input: "[1,2,2]", expected: "[[],[1],[1,2],[1,2,2],[2],[2,2]]" },
    { label: "[3,1,3]", input: "[3,1,3]", expected: "[[],[1],[1,3],[1,3,3],[3],[3,3]]", note: "Not in order yet" },
    { label: "[2,2,2]", input: "[2,2,2]", expected: "[[],[2],[2,2],[2,2,2]]", note: "All twins" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-78", title: "Subsets" },
    { slug: "lc-39", title: "Combination Sum" },
    { slug: "lc-46", title: "Permutations" },
  ],
  answer: (input) => answerText(readItems(input)),
  frames: (input) => {
    const nums = readItems(input);
    const { moments, walk, sorted } = record(nums);
    return [
      ...pictureFrames(nums, walk),
      ...slowFrames(nums, walk),
      ...insightFrames(moments),
      ...solutionFrames(nums, moments, walk, sorted),
      ...practiceFrames(readItems(PRACTICE)),
      { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: walk.finished() },
    ];
  },
  View: AgyChoicesTreeView,
};
