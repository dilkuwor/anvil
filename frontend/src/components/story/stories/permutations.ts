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

/** Fresh items for the "your turn" run. The second path already needs an earlier item, so it reaches the trap. */
const PRACTICE = "[4,7,9]";
const FALLBACK = [1, 2, 3];

const TRAP = "The Left Behind Trap";

const CODE = [
  "List<List<Integer>> permute(int[] nums) {",
  "    List<List<Integer>> out = new ArrayList<>();",
  "    build(nums, new boolean[nums.length], new ArrayList<>(), out);",
  "    return out;",
  "}",
  "",
  "void build(int[] nums, boolean[] used, List<Integer> path, List<List<Integer>> out) {",
  "    if (path.size() == nums.length) {",
  "        out.add(new ArrayList<>(path));",
  "        return;",
  "    }",
  "    for (int i = 0; i < nums.length; i++) {",
  "        if (used[i]) continue;",
  "        used[i] = true;",
  "        path.add(nums[i]);",
  "        build(nums, used, path, out);",
  "        path.remove(path.size() - 1);",
  "        used[i] = false;",
  "    }",
  "}",
];

/** "[1,2,3]" → [1,2,3]. Two or three different items, so the whole path fits the picture. */
function readItems(input: string): number[] {
  const items = (input.match(/-?\d+/g) ?? []).map(Number);
  const distinct = items.filter((item, index) => items.indexOf(item) === index).slice(0, 3);
  return distinct.length >= 2 ? distinct : FALLBACK;
}

/**
 * Independent solver: no bag and no stepping back. Put each new item into every gap of every shorter
 * order, then put the orders in dictionary order of the items' positions.
 */
function solve(nums: number[]): number[][] {
  let orders: number[][] = [[]];
  nums.forEach((_, index) => {
    const grown: number[][] = [];
    for (const order of orders) for (let gap = 0; gap <= order.length; gap++) grown.push([...order.slice(0, gap), index, ...order.slice(gap)]);
    orders = grown;
  });
  const byPosition = (a: number[], b: number[]) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k];
    return 0;
  };
  return orders.sort(byPosition).map((order) => order.map((index) => nums[index]));
}

function answerText(nums: number[]): string {
  return listText(solve(nums).map(listText));
}

/** The mistake, really run: at each spot look only at the items after the one just taken. */
function forwardOnlyLines(nums: number[]): string[] {
  const out: string[] = [];
  const path: number[] = [];
  const build = (start: number) => {
    if (path.length === nums.length) {
      out.push(listText(path));
      return;
    }
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      build(i + 1);
      path.pop();
    }
  };
  build(0);
  return out;
}

type Kind = "start" | "forks" | "choose" | "full" | "unchoose";

type Moment = {
  kind: Kind;
  state: ChoiceTreeState;
  /** Which fork at the start this moment lies under. -1 = before any fork. */
  branch: number;
  item: string;
  bag: string;
  forks: number[];
  /** Forks here whose item sits earlier on the shelf than the item just taken. */
  behind: number[];
  next: number | null;
  here: number;
};

/** The real algorithm, run once. Every change becomes a moment with a copy of the picture. */
function record(nums: number[]): { moments: Moment[]; walk: ChoiceWalk } {
  const used = nums.map(() => false);
  const walk = new ChoiceWalk(() => ({
    label: "items",
    items: nums.map((value, index): ChoiceChip => (used[index] ? { text: String(value), tone: "window", note: "tag" } : { text: String(value), tone: "idle" })),
  }));
  const moments: Moment[] = [];
  const note = (kind: Kind, branch: number, more: Partial<Moment> = {}) =>
    moments.push({ kind, branch, item: "", forks: [], behind: [], next: null, here: walk.here, bag: listText(walk.bag), state: walk.snap(), ...more });

  const build = (branch: number, last: number) => {
    if (walk.bag.length === nums.length) {
      walk.write(listText(walk.bag));
      note("full", branch);
      return;
    }
    const free: number[] = [];
    for (let i = 0; i < nums.length; i++) if (!used[i]) free.push(i);
    const forks = walk.forks(free.map((i) => String(nums[i])));
    note("forks", branch, { forks, behind: forks.filter((_, k) => free[k] < last) });
    free.forEach((i, k) => {
      const under = branch < 0 ? k : branch;
      used[i] = true;
      walk.choose(forks[k]);
      note("choose", under, { item: String(nums[i]) });
      build(under, i);
      const item = walk.unchoose();
      used[i] = false;
      // The shelf is read when the picture is copied, so copy it after the tag is off.
      note("unchoose", under, { item, next: forks[k + 1] ?? null });
    });
  };

  note("start", -1);
  build(-1, -1);
  return { moments, walk };
}

function backQuiz(state: ChoiceTreeState): StoryQuiz {
  const items = state.bag.map((chip) => chip.text);
  return stepBackQuiz(listText(items.slice(0, -1)), listText(items), "[]");
}

function writeNowQuiz(bag: string, total: number): StoryQuiz {
  return {
    kind: "choice",
    question: `The bag now holds ${bag}. Does the walker write it in the notebook now?`,
    options: ["No, not yet", "Yes, right now"],
    answer: 0,
    why: `An order must hold every one of the ${total} items. The walker writes only when the bag is full.`,
  };
}

function whichForksQuiz(item: string, earlier: string[]): StoryQuiz {
  return {
    kind: "choice",
    question: `The walker has just taken ${item}. Which forks leave this spot?`,
    options: [`${countWords(earlier.length, "fork", "forks")}, for ${wordList(earlier)}: no tag, so still free`, `None: no item comes after ${item} on the shelf`],
    answer: 0,
    why: "In an order, any free item may come next. It does not matter where it sits on the shelf.",
  };
}

/** The Left Behind Trap, drawn: the earlier item's fork in coral, and the orders a forward-only walker never finds. */
function trapState(state: ChoiceTreeState, fork: number, nums: number[]): { state: ChoiceTreeState; found: number; lost: string[] } {
  const kept = forwardOnlyLines(nums);
  const lost = solve(nums).map(listText).filter((line) => !kept.includes(line));
  const items: ChoiceChip[] = [...kept.map((text) => ({ text, tone: "idle" as const })), ...lost.map((text) => ({ text, tone: "miss" as const, note: "lost" }))];
  return { state: trapPicture(state, fork, "easy to leave behind", { notebook: { label: "careless", items }, note: { text: "a walker who only looks forward", tone: "coral" } }), found: kept.length, lost };
}

/** Full detail runs until the trap has been drawn and the walker is back at the start. */
function detailEnd(moments: Moment[]): number {
  const trapAt = moments.findIndex((moment) => moment.behind.length > 0);
  return moments.findIndex((moment, index) => index > trapAt && moment.kind === "unchoose" && moment.here === 0);
}

function solutionFrames(nums: number[], moments: Moment[], walk: ChoiceWalk): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const total = nums.length;
  const allItems = total === 2 ? "both items" : `all ${total} items`;
  let askedWrite = false;
  let askedBack = false;
  let askedNext = false;
  let shownTrap = false;
  let backs = 0;

  const cut = detailEnd(moments);
  const detailed = moments.slice(0, cut + 1);
  const rest = moments.slice(cut + 1);
  detailed.forEach((moment, index) => {
    const before = detailed[index - 1];
    const { state, bag, item } = moment;
    switch (moment.kind) {
      case "start":
        frames.push({ scene, caption: "The walker stands at the start of the path. The bag is empty, the notebook is empty, and no item has a tag.", codeLine: 2, state });
        break;
      case "forks": {
        const texts = moment.forks.map((fork) => state.nodes[fork].text);
        if (moment.behind.length > 0 && !shownTrap) {
          shownTrap = true;
          const earlier = moment.behind.map((fork) => state.nodes[fork].text);
          const last = frames[frames.length - 1];
          if (last && !last.quiz) last.quiz = whichForksQuiz(before?.item ?? "", earlier);
          frames.push({
            scene,
            caption: `The walker looks along the whole shelf, from the first item. ${wordList(earlier)} ${earlier.length === 1 ? "sits" : "sit"} before ${before?.item ?? ""}, but has no tag. So a fork leaves for it.`,
            codeLine: 11,
            state,
          });
          const trap = trapState(state, moment.behind[0], nums);
          frames.push({
            scene,
            caption: `${TRAP}. A walker who only looks forward from ${before?.item ?? ""} leaves ${wordList(earlier)} behind. They would find ${trap.found} of the ${trap.found + trap.lost.length} orders.`,
            codeLine: 11,
            state: trap.state,
          });
        } else if (moment.here === 0) {
          frames.push({ scene, caption: `${countWords(texts.length, "fork leaves", "forks leave")} the start, one for each item: ${wordList(texts)}. They are dotted: not walked yet.`, codeLine: 11, state });
        } else if (frames[frames.length - 1]?.quiz) {
          frames.push({ scene, caption: `Not yet: an order needs ${allItems}. A fork leaves for every item without a tag: ${wordList(texts)}.`, codeLine: 12, state });
        } else {
          frames.push({ scene, caption: `${countWords(texts.length, "item has", "items have")} no tag: ${wordList(texts)}. So ${countWords(texts.length, "fork leaves", "forks leave").toLowerCase()} this spot.`, codeLine: 12, state });
        }
        break;
      }
      case "choose": {
        const frame: Frame = {
          scene,
          caption: askedWrite ? `The walker takes the fork ${item}. ${item} goes in the bag and gets a tag.` : `The walker takes the fork ${item} and puts ${item} in the bag. On the shelf, ${item} gets a tag.`,
          codeLine: askedWrite ? 14 : 13,
          state,
        };
        if (!askedWrite) {
          askedWrite = true;
          frame.quiz = writeNowQuiz(bag, total);
        }
        frames.push(frame);
        break;
      }
      case "full": {
        const frame: Frame = {
          scene,
          caption: askedBack ? `The bag is full again. The walker writes a copy in the notebook: ${bag}.` : `Now ${allItems} are in the bag: a full order. The walker writes a copy in the notebook: ${bag}. The path ends here.`,
          codeLine: 8,
          state,
        };
        if (!askedBack) {
          askedBack = true;
          frame.quiz = backQuiz(state);
        }
        frames.push(frame);
        break;
      }
      case "unchoose": {
        const again = before?.kind === "unchoose";
        const frame: Frame = {
          scene,
          caption:
            backs === 0
              ? `The walker steps back one spot and takes ${item} out of the bag. Its tag comes off the shelf, so ${item} is free again.`
              : again
                ? `No fork is left at this spot. The walker steps back again and takes ${item} out. The bag is ${bagWords(bag)}, and ${item} is free.`
                : `The walker steps back one spot and takes ${item} out of the bag. The bag is ${bagWords(bag)}, and ${item} is free again.`,
          codeLine: backs === 0 ? 17 : 16,
          state,
        };
        backs++;
        if (!askedNext && moment.next !== null) {
          askedNext = true;
          frame.quiz = nextForkQuiz(state, moment.here, moment.next);
        }
        frames.push(frame);
        break;
      }
    }
  });

  const branches = [...new Set(rest.map((moment) => moment.branch))];
  branches.forEach((branch, at) => {
    const inside = rest.filter((moment) => moment.branch === branch);
    const lines = inside.filter((moment) => moment.kind === "full").map((moment) => moment.bag);
    frames.push({
      scene,
      caption:
        at === 0
          ? `The same happens down the fork ${nums[branch]}. The walker writes ${wordList(lines)}, and takes every item out again on the way back.`
          : `Down the fork ${nums[branch]} the walker writes ${wordList(lines)}, and steps back to the start with an empty bag.`,
      codeLine: 15,
      state: inside[inside.length - 1].state,
    });
  });

  const orders = moments.filter((moment) => moment.kind === "full").length;
  const spots = moments.filter((moment) => moment.kind === "choose").length + 1;
  frames.push({ scene, caption: `Every fork has been walked, the bag is empty, and no tag is left. The answer is ${answerText(nums)}.`, codeLine: 3, state: walk.finished() });
  frames.push({
    scene,
    caption: `Time: O(n · n!). ${total} items can stand in ${orders} orders, and each full bag of ${total} is copied once. A tag answers at a glance, with no search through the bag.`,
    codeLine: 12,
    state: walk.finished({ counter: { label: "spots walked", value: spots } }),
  });
  frames.push({
    scene,
    caption: `Space: O(n). Apart from the notebook, the walker needs one bag of at most ${total} items, and one tag for each item on the shelf.`,
    codeLine: 2,
    state: walk.finished({
      bag: nums.map((value) => ({ text: String(value), tone: "hit" as const })),
      shelf: { label: "items", items: nums.map((value) => ({ text: String(value), tone: "hit" as const, note: "tag" })) },
      note: { text: "one bag, one row of tags", tone: "teal" },
    }),
  });
  return frames;
}

/** The practice run: the same real walk on fresh items, told briefly. The reader makes each decision. */
function practiceFrames(nums: number[]): Frame[] {
  const scene: SceneId = "card";
  const { moments, walk } = record(nums);
  const frames: Frame[] = [];
  const cut = detailEnd(moments);
  const detailed = moments.slice(0, cut + 1);
  const rest = moments.slice(cut + 1);
  let askedWrite = false;
  let shownTrap = false;
  let revealWrite = false;

  detailed.forEach((moment, index) => {
    const before = detailed[index - 1];
    const { state, bag, item } = moment;
    if (moment.kind === "forks" && moment.here === 0) {
      frames.push({ scene, caption: `Your turn, with new items: ${wordList(nums)}. The walker stands at the start with an empty bag.`, state });
    } else if (moment.kind === "forks" && moment.behind.length > 0 && !shownTrap) {
      shownTrap = true;
      const earlier = moment.behind.map((fork) => state.nodes[fork].text);
      const last = frames[frames.length - 1];
      if (last && !last.quiz) last.quiz = whichForksQuiz(before?.item ?? "", earlier);
      frames.push({ scene, caption: `${wordList(earlier)} has no tag, so a fork leaves for it, even though it sits before ${before?.item ?? ""} on the shelf.`, state });
      const trap = trapState(state, moment.behind[0], nums);
      frames.push({ scene, caption: `Looking only forward is ${TRAP.replace(/^The /, "the ")}: ${wordList(earlier)} is left behind, and only ${trap.found} of the ${trap.found + trap.lost.length} orders is found.`, state: trap.state });
    } else if (moment.kind === "choose") {
      const frame: Frame = { scene, caption: `${revealWrite ? "Not yet: the bag is not full. " : ""}The walker takes the fork ${item}. The bag is ${bag}.`, state };
      revealWrite = false;
      if (!askedWrite) {
        askedWrite = true;
        revealWrite = true;
        frame.quiz = writeNowQuiz(bag, nums.length);
      }
      frames.push(frame);
    } else if (moment.kind === "full") {
      frames.push({ scene, caption: `The bag is full. The walker writes ${bag} in the notebook, and the path ends.`, state, quiz: backQuiz(state) });
    } else if (moment.kind === "unchoose") {
      const frame: Frame = { scene, caption: `The walker steps back and takes ${item} out of the bag. The bag is ${bagWords(bag)}, and ${item} is free again.`, state };
      if (moment.next !== null) frame.quiz = nextForkQuiz(state, moment.here, moment.next);
      frames.push(frame);
    }
  });

  const firstChoice = rest.find((moment) => moment.kind === "choose");
  const lines = rest.filter((moment) => moment.kind === "full").map((moment) => moment.bag);
  if (firstChoice) frames.push({ scene, caption: `The walker takes the fork ${firstChoice.item} at the start. ${firstChoice.item} goes in the bag and gets a tag.`, state: firstChoice.state });
  if (rest.length > 0) frames.push({ scene, caption: `The rest of the walk goes the same way. It adds ${wordList(lines)}.`, state: rest[rest.length - 1].state });
  frames.push({ scene, caption: `Done. The notebook holds all ${moments.filter((moment) => moment.kind === "full").length} orders. At every spot you looked along the whole shelf.`, state: walk.finished() });
  return frames;
}

function pictureFrames(nums: number[], walk: ChoiceWalk): Frame[] {
  const all = solve(nums).map(listText);
  const swapped = listText([nums[1], nums[0], ...nums.slice(2)]);
  const twice = [nums[0], nums[0], ...nums.slice(1, -1)];
  const missing = nums[nums.length - 1];
  const allowed = { label: "allowed", items: [{ text: listText(nums), tone: "done" as const }, { text: swapped, tone: "done" as const }] };
  return [
    { scene: "picture", caption: `These are the items: ${wordList(nums)}. A permutation is one way to put all of them in a row.`, state: walk.plain([]) },
    { scene: "picture", caption: `${listText(nums)} is one order, and ${swapped} is another. The same items in a different order count as a different answer.`, state: walk.plain([allowed]) },
    {
      scene: "picture",
      caption: `${listText(twice)} is not allowed: ${nums[0]} is used twice, and ${missing} is missing.`,
      state: walk.plain([allowed, { label: "not allowed", items: [{ text: listText(twice), tone: "miss" as const }] }]),
    },
    {
      scene: "picture",
      caption: `The goal: list every order of the items. With ${nums.length} items there are ${all.length}.`,
      state: walk.plain([{ label: `all ${all.length}`, items: all.map((text) => ({ text, tone: "hit" as const })) }]),
    },
  ];
}

/** The slow way, really run: the same walk, but "is this item free?" is answered by searching through the bag. */
function slowFrames(nums: number[], walk: ChoiceWalk): Frame[] {
  let looks = 0;
  let shown: { bag: number[]; item: number; looks: number; before: number } | null = null;
  const path: number[] = [];
  const build = () => {
    if (path.length === nums.length) return;
    for (const value of nums) {
      const before = looks;
      let found = false;
      for (const held of path) {
        looks++;
        if (held === value) {
          found = true;
          break;
        }
      }
      // The first search through a bag of all but one item, for the one item that is not in it.
      if (!found && path.length === nums.length - 1 && !shown) shown = { bag: [...path], item: value, looks, before };
      if (found) continue;
      path.push(value);
      build();
      path.pop();
    }
  };
  build();
  const first = shown as { bag: number[]; item: number; looks: number; before: number } | null;
  const bagRow = { label: "bag", items: (first?.bag ?? []).map((value) => ({ text: String(value), tone: "window" as const })) };
  const askRow = { label: "is it in?", items: [{ text: String(first?.item ?? nums[0]), tone: "edge" as const }] };
  return [
    {
      scene: "slow",
      caption: `The slow way walks the same forks. But to learn whether ${first?.item} is free, it searches the bag, item by item: ${(first?.looks ?? 0) - (first?.before ?? 0)} looks.`,
      state: walk.plain([bagRow, askRow], { counter: { label: "looks into the bag", value: first?.looks ?? 0 } }),
    },
    {
      scene: "slow",
      caption: `It searches like that for every item, at every spot of the walk. For ${nums.length} items that adds up to ${looks} looks into the bag.`,
      state: walk.plain([bagRow, askRow], { counter: { label: "looks into the bag", value: looks } }),
    },
    {
      scene: "slow",
      caption: "Each search grows with the bag, so this costs O(n² · n!) time. A tag on each item would answer the same question at a glance.",
      state: walk.plain([{ ...bagRow, items: bagRow.items.map((chip) => ({ ...chip, tone: "faded" as const })) }, { ...askRow, items: askRow.items.map((chip) => ({ ...chip, tone: "faded" as const })) }], { counter: { label: "looks into the bag", value: looks } }),
    },
  ];
}

function insightFrames(moments: Moment[]): Frame[] {
  const full = moments.find((moment) => moment.kind === "full");
  const back = moments.find((moment) => moment.kind === "unchoose");
  const again = back ? moments[moments.indexOf(back) + 1] : undefined;
  if (!full || !back || !again || again.kind !== "unchoose") return [];
  return [
    { scene: "insight", caption: "Picture a walker on a branching path, carrying a bag and a notebook. At each fork one item goes in the bag, and gets a tag on the shelf.", state: full.state },
    { scene: "insight", caption: `A full bag is one order, and the walker writes it down. Then they step back one spot and take the last item, ${back.item}, out. Its tag comes off.`, state: back.state },
    { scene: "insight", caption: `One more step back, and ${again.item} is free too. Now a different item can go in first. Choose, walk on, un-choose: every order gets its turn.`, state: again.state },
  ];
}

export const permutationsStory: ProblemStory<ChoiceTreeState> = {
  slugs: ["lc-46"],
  pattern: "Permutations",
  trigger: "“all possible orderings” (permutations) of distinct numbers",
  insight: "A walker with a bag, and a tag on every item that is in it. At each spot, look along the whole shelf: any item without a tag can go in next. Step back, tag off.",
  metaphor: {
    name: "The path of choices",
    legend: "bag = path · tag = used[i] · notebook = out · forks = every i with no tag · step back = path.remove and used[i] = false",
    terms: ["walker", "bag", "fork", "notebook", "tag", "shelf"],
  },
  traps: [{ name: TRAP, rule: "At every spot the loop starts at index 0, not at the current index. Any unused item may come next, or earlier items are left behind." }],
  template: [
    "walk(bag):",
    "    if (bag is full) { write down a copy; return; }",
    "    for each item, from the first one:",
    "        if (item has a tag) skip it;",
    "        tag it;  put it in bag;      // choose",
    "        walk(bag);                   // explore",
    "        take it out;  untag it;      // un-choose",
  ],
  complexity: {
    slow: "O(n² · n!)",
    time: "O(n · n!)",
    timeWhy: "n! full bags, each copied in n steps; a tag check costs one glance instead of a search through the bag",
    space: "O(n)",
    spaceWhy: "one bag, one row of tags, and a path never deeper than n",
  },
  code: CODE,
  examples: [
    { label: "[1,2,3]", input: "[1,2,3]", expected: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]" },
    { label: "[0,1]", input: "[0,1]", expected: "[[0,1],[1,0]]", note: "Two items, two orders" },
    { label: "[5,3,8]", input: "[5,3,8]", expected: "[[5,3,8],[5,8,3],[3,5,8],[3,8,5],[8,5,3],[8,3,5]]", note: "Shelf order, not size order" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-78", title: "Subsets" },
    { slug: "lc-90", title: "Subsets II" },
    { slug: "lc-39", title: "Combination Sum" },
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
