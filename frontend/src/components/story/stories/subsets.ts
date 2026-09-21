import { AgyChoicesTreeView, ChoiceWalk, bagWords, countWords as count, listText, nextForkQuiz, stepBackQuiz, wordList, type ChoiceChip, type ChoiceTreeState } from "../agy-choices-tree-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<ChoiceTreeState>;

/** Fresh items for the "your turn" run. The first step back reaches the trap. */
const PRACTICE = "[2,5,8]";
const FALLBACK = [1, 2, 3];

const TRAP = "The Empty Notebook Trap";

const CODE = [
  "List<List<Integer>> subsets(int[] nums) {",
  "    List<List<Integer>> out = new ArrayList<>();",
  "    build(nums, 0, new ArrayList<>(), out);",
  "    return out;",
  "}",
  "",
  "void build(int[] nums, int start, List<Integer> path, List<List<Integer>> out) {",
  "    out.add(new ArrayList<>(path));",
  "    for (int i = start; i < nums.length; i++) {",
  "        path.add(nums[i]);",
  "        build(nums, i + 1, path, out);",
  "        path.remove(path.size() - 1);",
  "    }",
  "}",
];

/** "[1,2,3]" → [1,2,3]. At most four items, so the path always fits the picture. */
function readItems(input: string): number[] {
  const items = (input.match(/-?\d+/g) ?? []).map(Number).slice(0, 4);
  const distinct = items.filter((item, index) => items.indexOf(item) === index);
  return distinct.length > 0 ? distinct : FALLBACK;
}

/**
 * Independent solver: no walking at all. Every number from 0 to 2^n - 1 is one subset (bit k = item k is in),
 * then the subsets are put in dictionary order of their positions.
 */
function solve(nums: number[]): number[][] {
  const picks: number[][] = [];
  for (let mask = 0; mask < 1 << nums.length; mask++) picks.push(nums.map((_, index) => index).filter((index) => (mask >> index) & 1));
  const order = (a: number[], b: number[]) => {
    for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) return a[k] - b[k];
    return a.length - b.length;
  };
  return picks.sort(order).map((pick) => pick.map((index) => nums[index]));
}

function answerText(nums: number[]): string {
  return listText(solve(nums).map(listText));
}

type Kind = "start" | "write" | "forks" | "end" | "choose" | "unchoose";

type Moment = {
  kind: Kind;
  state: ChoiceTreeState;
  /** Which fork at the start this moment lies under. -1 = before any fork. */
  branch: number;
  item: string;
  /** The bag as text, at this moment. */
  bag: string;
  forks: number[];
  /** After a step back: the next fork at this spot that is not walked yet. */
  next: number | null;
  here: number;
};

/** The real algorithm, run once. Every change becomes a moment with a copy of the picture. */
function record(nums: number[]): { moments: Moment[]; walk: ChoiceWalk } {
  let from = 0;
  const chosen: number[] = [];
  const walk = new ChoiceWalk(() => ({
    label: "items",
    items: nums.map((value, index): ChoiceChip => ({ text: String(value), tone: chosen.includes(index) ? "window" : index < from ? "faded" : "idle" })),
  }));
  const moments: Moment[] = [];
  const note = (kind: Kind, branch: number, more: Partial<Moment> = {}) =>
    moments.push({ kind, branch, item: "", forks: [], next: null, here: walk.here, bag: listText(walk.bag), state: walk.snap(), ...more });

  const build = (start: number, branch: number) => {
    from = start;
    walk.write(listText(walk.bag));
    note("write", branch);
    const forks = walk.forks(nums.slice(start).map(String));
    note(forks.length > 0 ? "forks" : "end", branch, { forks });
    forks.forEach((fork, k) => {
      const index = start + k;
      const under = branch < 0 ? k : branch;
      walk.choose(fork);
      chosen.push(index);
      from = index + 1;
      note("choose", under, { item: String(nums[index]) });
      build(index + 1, under);
      const item = walk.unchoose();
      chosen.pop();
      from = start;
      note("unchoose", under, { item, next: forks[k + 1] ?? null });
    });
  };

  note("start", -1);
  build(0, -1);
  return { moments, walk };
}

function writeNowQuiz(bag: string): StoryQuiz {
  return {
    kind: "choice",
    question: `The bag now holds ${bag}. Does the walker write it in the notebook now?`,
    options: ["Yes, right now", "No, only when the path ends"],
    answer: 0,
    why: "Every spot on the path is a subset, not only the last one. So the walker writes at every spot.",
  };
}

function copyQuiz(line: string, bag: string): StoryQuiz {
  return {
    kind: "choice",
    question: `Suppose the walker had put the bag itself in the notebook, not a copy. What would the line ${line} say now?`,
    options: [`${bag}, the same as the bag`, `${line}, as it was written`],
    answer: 0,
    why: "A line that is the bag itself has no life of its own. It always shows what the bag holds at this moment.",
  };
}

function backQuiz(state: ChoiceTreeState): StoryQuiz {
  const items = state.bag.map((chip) => chip.text);
  return stepBackQuiz(listText(items.slice(0, -1)), listText(items), "[]");
}

/** The mistake, drawn: every notebook line is the bag itself, so they all show the bag as it is now. */
function carelessState(state: ChoiceTreeState, bag: string): ChoiceTreeState {
  return { ...state, notebook: { label: "careless", items: state.notebook.items.map(() => ({ text: bag, tone: "miss" as const })) }, note: { text: "every line is the bag itself", tone: "coral" } };
}

function solutionFrames(nums: number[], moments: Moment[], walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const names = nums.map(String);
  let askedWrite = false;
  let askedBack = false;
  let askedNext = false;
  let shownTrap = false;
  let shownForward = false;
  let ends = 0;

  const first = moments.filter((moment) => moment.branch <= 0);
  first.forEach((moment, index) => {
    const before = first[index - 1];
    const after = first[index + 1];
    const { state, bag, item } = moment;
    switch (moment.kind) {
      case "start":
        frames.push({ scene, caption: "The walker stands at the start of the path. The bag is empty, and so is the notebook.", codeLine: 2, state });
        break;
      case "write":
        if (bag === "[]") {
          frames.push({ scene, caption: "First the walker writes a copy of the bag in the notebook. The bag is empty, and the empty bag is a subset too.", codeLine: 7, state });
        } else if (before?.kind === "choose" && frames[frames.length - 1]?.quiz) {
          frames.push({ scene, caption: `Every spot on the path is a subset. So the walker writes a copy of the bag in the notebook: ${bag}.`, codeLine: 7, state });
        } else {
          const closes = after?.kind === "end" && ends > 0;
          frames.push({ scene, caption: `The walker writes a copy of the bag in the notebook: ${bag}.${closes ? " No fork leaves this spot, so the path ends here too." : ""}`, codeLine: 7, state });
        }
        break;
      case "forks": {
        const texts = moment.forks.map((fork) => state.nodes[fork].text);
        if (moment.here === 0) {
          frames.push({ scene, caption: `${count(texts.length, "fork leaves", "forks leave")} the start, one for each item: ${wordList(texts)}. They are dotted: not walked yet.`, codeLine: 8, state });
        } else if (!shownForward) {
          shownForward = true;
          frames.push({ scene, caption: `Forks only lead forward, to later items. From this spot: ${wordList(texts)}. There is never a fork back to ${names[0]}.`, codeLine: 8, state });
        } else {
          frames.push({ scene, caption: `${count(texts.length, "fork leaves", "forks leave")} this spot: ${wordList(texts)}.`, codeLine: 8, state });
        }
        break;
      }
      case "end": {
        if (ends++ > 0) break;
        const frame: Frame = { scene, caption: `No item comes after ${item || names[names.length - 1]}, so no fork leaves this spot. The path ends here.`, codeLine: 8, state };
        if (!askedBack) {
          askedBack = true;
          frame.quiz = backQuiz(state);
        }
        frames.push(frame);
        break;
      }
      case "choose": {
        const frame: Frame = { scene, caption: `The walker takes the fork ${item} and puts ${item} in the bag.`, codeLine: 9, state };
        if (!askedWrite) {
          askedWrite = true;
          frame.quiz = writeNowQuiz(bag);
        }
        frames.push(frame);
        break;
      }
      case "unchoose": {
        const again = before?.kind === "unchoose";
        const frame: Frame = {
          scene,
          caption: again
            ? `No fork is left at this spot. The walker steps back again and takes ${item} out of the bag. The bag is ${bagWords(bag)}.`
            : `The walker steps back one spot and takes ${item} out of the bag. The bag is ${bagWords(bag)} again.`,
          codeLine: 11,
          state,
        };
        if (!askedNext && moment.next !== null && shownTrap) {
          askedNext = true;
          frame.quiz = nextForkQuiz(state, moment.here, moment.next);
        }
        frames.push(frame);
        if (!shownTrap) {
          shownTrap = true;
          const line = listText([...state.bag.map((chip) => chip.text), item]);
          frames.push({ scene, caption: `Look at the notebook. The line ${line} did not change when ${item} left the bag.`, codeLine: 7, state: { ...state, leaving: null }, quiz: copyQuiz(line, bag) });
          frames.push({
            scene,
            caption: `${TRAP}. Lines that are the bag itself all change with the bag. When the walk is over the bag is empty, so every line would be empty.`,
            codeLine: 7,
            state: carelessState({ ...state, leaving: null }, bag),
          });
        }
        break;
      }
    }
  });

  // The other forks at the start go the same way: really walked, told in one frame each.
  const branches = [...new Set(moments.map((moment) => moment.branch))].filter((branch) => branch > 0);
  for (const branch of branches) {
    const inside = moments.filter((moment) => moment.branch === branch);
    const lines = inside.filter((moment) => moment.kind === "write").map((moment) => moment.bag);
    const last = inside[inside.length - 1];
    frames.push({
      scene,
      caption:
        branch === 1
          ? `The same happens down the fork ${names[branch]}. The walker writes ${wordList(lines)}, and takes each item out again on the way back.`
          : `Down the fork ${names[branch]} the walker writes ${wordList(lines)}, and steps back to the start with an empty bag.`,
      codeLine: 10,
      state: last.state,
    });
  }

  const spots = moments.filter((moment) => moment.kind === "write").length;
  const fullest = Math.max(...moments.map((moment) => moment.state.bag.length));
  const deepest = moments.find((moment) => moment.state.bag.length === fullest);
  frames.push({ scene, caption: `Every fork has been walked, and the bag is empty again. The answer is ${answerText(nums)}.`, codeLine: 3, state: walk.finished() });
  frames.push({
    scene,
    caption: `Time: O(n · 2^n). Each item is in or out, so ${nums.length} items make ${spots} spots. At each spot the walker copies a bag of at most ${nums.length} items.`,
    codeLine: 7,
    state: walk.finished({ counter: { label: "spots written", value: spots } }),
  });
  frames.push({
    scene,
    caption: `Space: O(n). Apart from the notebook, the walker carries one bag, never more than ${fullest} items. The slow way kept a whole pile of lists.`,
    codeLine: 9,
    state: walk.finished({ bag: (deepest?.state.bag ?? []).map((chip) => ({ ...chip, tone: "hit" as const })), note: { text: "the bag at its fullest", tone: "teal" } }),
  });
  return frames;
}

/** The practice run: the same real walk on fresh items, told briefly. The reader makes each decision. */
function practiceFrames(nums: number[]): Frame[] {
  const scene: SceneId = "card";
  const { moments, walk } = record(nums);
  const frames: Frame[] = [];
  const names = nums.map(String);
  const first = moments.filter((moment) => moment.branch <= 0);
  let askedWrite = false;
  let revealWrite = false;
  let shownTrap = false;

  first.forEach((moment, index) => {
    const before = first[index - 1];
    const after = first[index + 1];
    const { state, bag, item } = moment;
    if (moment.kind === "forks" && moment.here === 0) {
      frames.push({ scene, caption: `Your turn, with new items: ${wordList(names)}. The walker has written the empty bag and stands at the start.`, state });
    } else if (moment.kind === "choose" && !askedWrite) {
      askedWrite = true;
      revealWrite = true;
      frames.push({ scene, caption: `The walker takes the fork ${item} and puts ${item} in the bag.`, state, quiz: writeNowQuiz(bag) });
    } else if (moment.kind === "write" && bag !== "[]") {
      const ends = after?.kind === "end";
      const frame: Frame = {
        scene,
        caption: revealWrite ? `The walker writes ${bag} in the notebook, as at every spot.` : `The walker takes the fork ${before?.item ?? ""}, and writes ${bag}.${ends ? " The path ends here." : ""}`,
        state,
      };
      revealWrite = false;
      if (ends) frame.quiz = backQuiz(state);
      frames.push(frame);
    } else if (moment.kind === "unchoose") {
      const frame: Frame = { scene, caption: `The walker steps back and takes ${item} out of the bag. The bag is ${bagWords(bag)}.`, state };
      if (moment.next !== null && shownTrap) frame.quiz = nextForkQuiz(state, moment.here, moment.next);
      frames.push(frame);
      if (!shownTrap) {
        shownTrap = true;
        const line = listText([...state.bag.map((chip) => chip.text), item]);
        frames.push({ scene, caption: `Look at the line ${line} in the notebook.`, state: { ...state, leaving: null }, quiz: copyQuiz(line, bag) });
        frames.push({ scene, caption: `That is ${TRAP.replace(/^The /, "the ")}: every line shows the bag as it is now. So the walker always writes a copy.`, state: carelessState({ ...state, leaving: null }, bag) });
      }
    }
  });

  const rest = moments.filter((moment) => moment.branch > 0);
  const lines = rest.filter((moment) => moment.kind === "write").map((moment) => moment.bag);
  const firstChoice = rest.find((moment) => moment.kind === "choose");
  if (firstChoice) frames.push({ scene, caption: `The walker takes the fork ${firstChoice.item} at the start and puts ${firstChoice.item} in the bag.`, state: firstChoice.state });
  if (rest.length > 0) frames.push({ scene, caption: `The rest of the walk goes the same way. It adds ${wordList(lines)}.`, state: rest[rest.length - 1].state });
  frames.push({ scene, caption: `Done. The notebook holds all ${moments.filter((moment) => moment.kind === "write").length} subsets. You chose, walked on, and un-chose.`, state: walk.finished() });
  return frames;
}

function pictureFrames(nums: number[], walk: ChoiceWalk): Frame[] {
  const names = nums.map(String);
  const all = solve(nums).map(listText);
  const some = listText([nums[0], nums[nums.length - 1]]);
  const flipped = listText([nums[nums.length - 1], nums[0]]);
  const twice = listText([nums[0], nums[0]]);
  const allowed = { label: "allowed", items: [{ text: some, tone: "done" as const }] };
  const notAllowed = { label: "not allowed", items: [{ text: twice, tone: "miss" as const }] };
  return [
    { scene: "picture", caption: `These are the items: ${wordList(names)}. A subset is any group picked from them. Each box is one item.`, state: walk.plain([]) },
    { scene: "picture", caption: `${some} is a subset. The order does not matter, so ${flipped} is the same subset and is not listed again.`, state: walk.plain([allowed]) },
    { scene: "picture", caption: `${twice} is not allowed. Each item can be picked only once.`, state: walk.plain([allowed, notAllowed]) },
    {
      scene: "picture",
      caption: `The goal: list every subset, each one once. With ${nums.length} items there are ${all.length}, and the empty group counts too.`,
      state: walk.plain([{ label: `all ${all.length}`, items: all.map((text) => ({ text, tone: "hit" as const })) }]),
    },
  ];
}

/** The obvious way, really run: keep a pile of finished lists and copy the whole pile for each new item. */
function slowFrames(nums: number[], walk: ChoiceWalk): Frame[] {
  const frames: Frame[] = [];
  const pile: number[][] = [[]];
  let copied = 0;
  const rows = [{ label: "pile", items: [{ text: "[]", tone: "window" as const }] as ChoiceChip[] }];
  frames.push({ scene: "slow", caption: "The obvious way: keep a pile of finished lists. It starts with one list, the empty one.", state: walk.plain(rows.map((row) => ({ ...row })), { counter: { label: "items copied", value: copied } }) });
  nums.forEach((value, round) => {
    const size = pile.length;
    const made: number[][] = [];
    for (let k = 0; k < size; k++) {
      const copy = [...pile[k], value];
      copied += copy.length;
      made.push(copy);
    }
    pile.push(...made);
    rows.forEach((row) => (row.items = row.items.map((chip) => ({ ...chip, tone: "idle" as const }))));
    rows.push({ label: `add ${value}`, items: made.map((list) => ({ text: listText(list), tone: "window" as const })) });
    frames.push({
      scene: "slow",
      caption: round === 0 ? `Take the item ${value}. Copy every list in the pile, and add ${value} to each copy.` : `Now the item ${value}. Copy every list again, all ${size} of them, and add ${value} to each copy.`,
      state: walk.plain(rows.map((row) => ({ ...row })), { counter: { label: "items copied", value: copied } }),
    });
  });
  frames.push({
    scene: "slow",
    caption: `It works, but the pile doubles each round. All ${pile.length} lists are held at once, and ${copied} items were copied. That is O(n · 2^n) time, and as much room.`,
    state: walk.plain(rows.map((row) => ({ ...row, items: row.items.map((chip) => ({ ...chip, tone: "faded" as const })) })), { counter: { label: "items copied", value: copied } }),
  });
  return frames;
}

function insightFrames(moments: Moment[]): Frame[] {
  const end = moments.find((moment) => moment.kind === "end");
  const back = moments.find((moment) => moment.kind === "unchoose");
  const again = back ? moments[moments.indexOf(back) + 1] : undefined;
  if (!end || !back || !again || again.kind !== "unchoose" || again.next === null) return [];
  const nextFork = again.state.nodes[again.next].text;
  return [
    { scene: "insight", caption: "Picture a walker on a branching path, carrying a bag and a notebook. At each fork they put one item in the bag and walk on.", state: end.state },
    { scene: "insight", caption: `When the path ends, the walker does not start over. They step back one spot and take the last item, ${back.item}, out of the bag.`, state: back.state },
    { scene: "insight", caption: `One more step back, and ${again.item} leaves too. Now the bag is right for the next fork, ${nextFork}. Choose, walk on, un-choose: one bag is enough.`, state: again.state },
  ];
}

export const subsetsStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-78"],
  pattern: "Subsets",
  trigger: "“return all subsets” (the power set) of distinct numbers",
  insight: "A walker on a branching path with one bag: put an item in, write the bag down at every spot, walk on, then step back and take the item out.",
  metaphor: {
    name: "The path of choices",
    legend: "bag = path · notebook = out · forks = the loop from start · step back = path.remove",
    terms: ["walker", "bag", "fork", "notebook", "spot"],
  },
  traps: [{ name: TRAP, rule: "Write a copy of the bag, never the bag itself: out.add(new ArrayList<>(path)). The bag ends up empty, and so would every line." }],
  template: [
    "walk(start, bag):",
    "    write down a copy of bag;",
    "    for each item from start onward:",
    "        put item in bag;              // choose",
    "        walk(next position, bag);     // explore",
    "        take item out of bag;         // un-choose",
  ],
  complexity: {
    slow: "O(n · 2^n)",
    time: "O(n · 2^n)",
    timeWhy: "each item is in or out, so there are 2^n spots, and each spot copies a bag of up to n items",
    space: "O(n)",
    spaceWhy: "one bag and one path, never deeper than n (the notebook itself is the answer)",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3]", input: "[1,2,3]", expected: "[[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]" },
    { label: "[4,9]", input: "[4,9]", expected: "[[],[4],[4,9],[9]]", note: "Two items, four subsets" },
    { label: "[3,4,5]", input: "[3,4,5]", expected: "[[],[3],[3,4],[3,4,5],[3,5],[4],[4,5],[5]]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-90", title: "Subsets II" },
    { slug: "lc-39", title: "Combination Sum" },
    { slug: "lc-46", title: "Permutations" },
  ],
  answer: (input) => answerText(readItems(input)),
  frames: (input) => {
    const nums = readItems(input);
    const { moments, walk } = record(nums);
    return [
      ...pictureFrames(nums, walk),
      ...slowFrames(nums, walk),
      ...insightFrames(moments),
      ...solutionFrames(nums, moments, walk),
      ...practiceFrames(readItems(PRACTICE)),
      { scene: "card", caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.", state: walk.finished() },
    ];
  },
  View: AgyChoicesTreeView,
};
