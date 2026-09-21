import type { CellTone } from "@/components/learn/viz/primitives";

import { AgyDp2StonesView, type StonesState } from "../agy-dp2-stones-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<StonesState>;

/** Fresh cards for the "your turn" run. The tops end as 1, 2, 5, which is not a chain in the cards. */
const PRACTICE = "nums=[3,4,1,5,2]";

const CODE = [
  "int[] tails = new int[nums.length];",
  "int size = 0;",
  "for (int x : nums) {",
  "    int low = 0;",
  "    int high = size;",
  "    while (low < high) {",
  "        int mid = low + (high - low) / 2;",
  "        if (tails[mid] < x) {",
  "            low = mid + 1;",
  "        } else {",
  "            high = mid;",
  "        }",
  "    }",
  "    tails[low] = x;",
  "    if (low == size) {",
  "        size++;",
  "    }",
  "}",
  "return size;",
];

/** The slow way stops counting here, so a large input cannot freeze the page. */
const SLOW_CAP = 20000;

function parseInput(raw: string): number[] {
  const list = raw.match(/\[([^\]]*)\]/)?.[1] ?? "";
  const nums = list.split(",").map((part) => Number.parseInt(part.trim(), 10)).filter((value) => !Number.isNaN(value));
  return nums.length === 0 ? [10, 9, 2, 5, 3, 7, 101, 18] : nums;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Independent solver for `answer()`: the table way. Also returns one real longest chain, as positions. */
function longestChain(nums: number[], upTo = nums.length): number[] {
  const length = Array.from({ length: upTo }, () => 1);
  const before: (number | null)[] = Array.from({ length: upTo }, () => null);
  let end = 0;
  for (let i = 0; i < upTo; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && length[j] + 1 > length[i]) {
        length[i] = length[j] + 1;
        before[i] = j;
      }
    }
    if (length[i] > length[end]) end = i;
  }
  const chain: number[] = [];
  for (let at: number | null = end; at !== null; at = before[at]) chain.unshift(at);
  return chain;
}

type Look = { low: number; high: number; mid: number; smaller: boolean };
type Deal = {
  card: number;
  index: number;
  /** Tops and pile count before this card. */
  tops: number[];
  looks: Look[];
  /** The pile (from 0) the card lands on. */
  pile: number;
  grew: boolean;
};

/** The real algorithm, recorded card by card. */
function deal(nums: number[]): { deals: Deal[]; tops: number[]; looks: number } {
  const tails: number[] = [];
  const deals: Deal[] = [];
  let total = 0;
  nums.forEach((card, index) => {
    const tops = [...tails];
    const looks: Look[] = [];
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = low + Math.floor((high - low) / 2);
      const smaller = tails[mid] < card;
      looks.push({ low, high, mid, smaller });
      if (smaller) low = mid + 1;
      else high = mid;
    }
    total += looks.length;
    const grew = low === tails.length;
    tails[low] = card;
    deals.push({ card, index, tops, looks, pile: low, grew });
  });
  return { deals, tops: tails, looks: total };
}

/** The Pile Tops Trap is real when the tops, read left to right, cannot be found in the cards in that order. */
function topsProblem(nums: number[], tops: number[]): { before: number; missing: number; literal: boolean } | null {
  let from = 0;
  for (let k = 0; k < tops.length; k++) {
    const at = nums.indexOf(tops[k], from);
    if (at === -1) {
      if (k === 0) return null;
      const before = tops[k - 1];
      const missing = tops[k];
      const literal = !nums.some((value, i) => value === before && nums.slice(i + 1).includes(missing));
      return { before, missing, literal };
    }
    from = at + 1;
  }
  return null;
}

type Draw = {
  tops?: number[];
  piles?: boolean;
  stoneTones?: Record<number, CellTone>;
  itemTones?: Record<number, CellTone>;
  dealt?: number;
  pointers?: { at: number; label: string }[];
  note?: string | null;
  counter?: { label: string; value: string } | null;
  trap?: string | null;
};

function draw(nums: number[], options: Draw = {}): StonesState {
  const piles = options.piles ?? true;
  const tops = options.tops ?? [];
  return {
    chipsLabel: "",
    chips: [],
    rowLabels: piles ? ["tops"] : [],
    stones: piles
      ? nums.map((_, index) => ({ marks: [index < tops.length ? String(tops[index]) : null], tone: options.stoneTones?.[index] ?? (index < tops.length ? "hit" : "idle"), label: String(index + 1) }))
      : [],
    items: nums.map((value, index) => ({ text: String(value), tone: options.itemTones?.[index] ?? (options.dealt !== undefined && index < options.dealt ? "faded" : "idle") })),
    itemsLabel: "cards",
    itemsAt: "under",
    here: null,
    pointers: options.pointers ?? [],
    hops: [],
    pickMode: "stones",
    bestNote: options.note ?? null,
    trapNote: options.trap ?? null,
    counter: options.counter ?? null,
  };
}

const tonesAt = (positions: number[], tone: CellTone): Record<number, CellTone> => Object.fromEntries(positions.map((position) => [position, tone]));

function pictureFrames(nums: number[], chain: number[]): Frame[] {
  const values = chain.map((position) => nums[position]);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: `These are the numbers ${nums.join(", ")}, in this order. A chain picks some of them, keeps their order, and may skip any.`,
      state: draw(nums, { piles: false }),
    },
    {
      scene: "picture",
      caption:
        values.length > 1
          ? `Allowed: ${values.join(", ")}. Each number is bigger than the one before it. This chain has ${values.length} numbers.`
          : `Allowed: ${values[0]} alone. A single number is a chain of 1.`,
      state: draw(nums, { piles: false, itemTones: tonesAt(chain, "done") }),
    },
  ];
  const drop = nums.findIndex((value, index) => index > 0 && value <= nums[index - 1]);
  if (drop > 0) {
    frames.push({
      scene: "picture",
      caption: `Not allowed: ${nums[drop - 1]}, ${nums[drop]}. The chain must rise at every step, and ${nums[drop]} is not bigger than ${nums[drop - 1]}.`,
      state: draw(nums, { piles: false, itemTones: tonesAt([drop - 1, drop], "miss") }),
    });
  }
  frames.push({
    scene: "picture",
    caption: "The goal: the length of the longest rising chain. Only its length is asked for, not the chain itself.",
    state: draw(nums, { piles: false, itemTones: tonesAt(chain, "done"), note: `longest chain: ${values.length}` }),
  });
  return frames;
}

type SlowRun = { choices: number; capped: boolean; best: number; ends: { chain: number[]; choicesSoFar: number }[] };

/** Really tries every mix of take and skip, counting every choice made. */
function runSlow(nums: number[]): SlowRun {
  const run: SlowRun = { choices: 0, capped: false, best: 0, ends: [] };
  const chain: number[] = [];
  const go = (index: number) => {
    if (run.capped) return;
    if (index === nums.length) {
      run.best = Math.max(run.best, chain.length);
      if (run.ends.length < 2 && chain.length > 0) run.ends.push({ chain: [...chain], choicesSoFar: run.choices });
      return;
    }
    if (run.choices >= SLOW_CAP) {
      run.capped = true;
      return;
    }
    run.choices++;
    if (chain.length === 0 || nums[index] > nums[chain.at(-1)!]) {
      chain.push(index);
      go(index + 1);
      chain.pop();
    }
    go(index + 1);
  };
  go(0);
  return run;
}

function slowFrames(nums: number[], run: SlowRun): Frame[] {
  const frames: Frame[] = run.ends.map((end, index) => {
    const values = end.chain.map((position) => nums[position]).join(", ");
    return {
      scene: "slow" as SceneId,
      caption:
        index === 0
          ? `The slow way: at every number choose take it or skip it, and try every mix. First mix: ${values}. Length ${end.chain.length}.`
          : `Step back, change the last choice, and go again: ${values}. Length ${end.chain.length}.`,
      state: draw(nums, { piles: false, itemTones: tonesAt(end.chain, "window"), counter: { label: "choices made", value: String(end.choicesSoFar) } }),
    };
  });
  const total = run.capped ? `more than ${SLOW_CAP}` : String(run.choices);
  frames.push({
    scene: "slow",
    caption: `Every mix tried: ${total} choices for only ${plural(nums.length, "number")}. The longest chain had ${run.best}. Each extra number can double the work: O(2^n) time.`,
    state: draw(nums, { piles: false, itemTones: tonesAt([...nums.keys()], "faded"), counter: { label: "choices made", value: run.capped ? `${SLOW_CAP}+` : String(run.choices) } }),
  });
  return frames;
}

function insightFrames(nums: number[], deals: Deal[]): Frame[] {
  const frames: Frame[] = [
    {
      scene: "insight",
      caption: "Picture dealing the numbers as cards onto a row of piles, left to right. We only ever look at the top card of each pile.",
      state: draw(nums, { itemTones: { 0: "edge" } }),
    },
  ];
  // The first moment two piles exist, or the first card if they never do.
  const twoPiles = deals.find((item) => item.grew && item.pile === 1) ?? null;
  if (twoPiles) {
    const tops = [...twoPiles.tops, twoPiles.card];
    const chain = longestChain(nums, twoPiles.index + 1).slice(-2);
    const real = chain.length === 2 && nums[chain[1]] === tops[1];
    frames.push({
      scene: "insight",
      caption: `Each top has one meaning. The top of pile 2, ${tops[1]}, is the smallest card that can end a rising chain of 2 cards so far.${real ? ` Here: ${nums[chain[0]]}, ${nums[chain[1]]}.` : ""}`,
      state: draw(nums, { tops, dealt: twoPiles.index + 1, stoneTones: { 1: "edge" }, itemTones: real ? tonesAt(chain, "hit") : undefined }),
    });
  } else {
    frames.push({
      scene: "insight",
      caption: `Each top has one meaning. The top of pile 1 is the smallest card that can end a rising chain of 1 card so far. Pile 2 would be the same for chains of 2.`,
      state: draw(nums, { tops: [nums[0]], dealt: 1, stoneTones: { 0: "edge" } }),
    });
  }
  const since = twoPiles?.index ?? 0;
  const swap = deals.find((item) => item.index > since && !item.grew && item.tops[item.pile] !== item.card) ?? null;
  if (swap) {
    frames.push({
      scene: "insight",
      caption: `A smaller top is better: more cards can follow it. So the card ${swap.card} takes the place of the top ${swap.tops[swap.pile]} on pile ${swap.pile + 1}. The pile count stays the same.`,
      state: draw(nums, { tops: swap.tops, dealt: swap.index, stoneTones: { [swap.pile]: "edge" }, itemTones: { [swap.index]: "edge" } }),
    });
  }
  const grow = deals.find((item) => item.grew && item.index > (swap?.index ?? since)) ?? twoPiles ?? deals[0];
  frames.push({
    scene: "insight",
    caption: `A card bigger than every top starts a new pile: a longer chain now exists. At the end, the number of piles is the length of the longest rising chain.`,
    state: draw(nums, { tops: [...grow.tops, grow.card], dealt: grow.index + 1, stoneTones: { [grow.pile]: "done" }, itemTones: { [grow.index]: "done" }, note: `piles: ${grow.pile + 1}` }),
  });
  return frames;
}

function whichPileQuiz(nums: number[], item: Deal): StoryQuiz {
  const { card, tops, pile } = item;
  const feedback: Record<number, string> = {};
  for (let index = 0; index < nums.length; index++) {
    if (index === pile) continue;
    if (index < tops.length && tops[index] < card) feedback[index] = `The top of pile ${index + 1} is ${tops[index]}, which is smaller than ${card}. A card never covers a smaller top.`;
    else if (index < tops.length) feedback[index] = `The card would fit there, but a pile further left takes it too. Always use the leftmost pile that fits.`;
    else if (pile < tops.length) feedback[index] = `A new pile is only for a card bigger than every top. One of the tops is not smaller than ${card}.`;
    else feedback[index] = "Piles are started one at a time, from the left. An earlier empty pile comes first.";
  }
  return {
    kind: "cell",
    cells: nums.length,
    question: `Which pile does the card ${card} go on? Click it.`,
    answer: pile,
    feedback,
    otherwise: "Find the leftmost pile whose top is not smaller than the card.",
    why:
      pile === tops.length
        ? `${card} is bigger than every top, so it starts a new pile.`
        : `The top ${tops[pile]} is the leftmost one that is not smaller than ${card}.`,
  };
}

function placedCaption(item: Deal): string {
  const { card, tops, pile } = item;
  if (tops.length === 0) return `No pile is in use yet, so the card ${card} starts pile 1.`;
  if (item.grew) return `The card ${card} is bigger than every top, so it starts pile ${pile + 1}.`;
  if (tops[pile] === card) return `The card ${card} covers the equal top ${tops[pile]} on pile ${pile + 1}. No new pile: a chain must rise, and ${card} is not bigger than ${card}.`;
  return `The card ${card} takes the place of the top ${tops[pile]} on pile ${pile + 1}. A lower top lets more cards follow.`;
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on fresh cards: the reader places every card.
 */
function dealFrames(nums: number[], scene: SceneId, practice: boolean, slowChoices: string): Frame[] {
  const { deals, tops: finalTops, looks: totalLooks } = deal(nums);
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const count = (size: number) => `piles: ${size}`;

  if (practice) {
    frames.push({ scene, caption: `Your turn, on new cards: ${nums.join(", ")}. The cards come by themselves. You choose the pile for every card.`, state: draw(nums, { note: count(0) }) });
  } else {
    frames.push({ scene, caption: `Lay out room for ${plural(nums.length, "pile")}: there can never be more piles than cards. Every pile is empty.`, codeLine: 0, state: draw(nums) });
    frames.push({ scene, caption: "No pile is in use yet, so the pile count is 0.", codeLine: 1, state: draw(nums, { note: count(0) }) });
  }

  let detailedSearches = 0;
  let detailedLong = false;
  let askedNew = false;
  let askedSwap = false;
  for (const item of deals) {
    const { card, index, tops, looks, pile } = item;
    const size = tops.length;
    const kindAsked = item.grew ? askedNew : askedSwap;
    const ask = size > 0 && (practice || !kindAsked);
    if (ask && item.grew) askedNew = true;
    if (ask && !item.grew) askedSwap = true;

    const next: Frame = { scene, caption: `The next card is ${card}.${size > 0 ? " It goes on the leftmost pile whose top is not smaller than it." : ""}`, codeLine: line(2), state: draw(nums, { tops, dealt: index, itemTones: { [index]: "edge" }, note: count(size) }) };
    if (ask) next.quiz = whichPileQuiz(nums, item);
    frames.push(next);

    const after = [...tops];
    after[pile] = card;
    const landed = (): StonesState => draw(nums, { tops: after, dealt: index + 1, stoneTones: { [pile]: item.grew ? "done" : "edge" }, itemTones: { [index]: item.grew ? "done" : "edge" }, note: count(size) });

    if (practice) {
      frames.push({ scene, caption: `${placedCaption(item)}${item.grew ? ` The pile count is now ${size + 1}.` : ""}`, state: { ...landed(), bestNote: count(item.grew ? size + 1 : size) } });
    } else if (looks.length > 0 && (detailedSearches === 0 || (!detailedLong && looks.length > 1))) {
      detailedSearches++;
      if (looks.length > 1) detailedLong = true;
      frames.push({
        scene,
        caption:
          detailedSearches === 1
            ? "The tops always rise from left to right, so we can find the pile by halving. Put a low mark on pile 1 and a high mark just past the last pile in use."
            : "Again a low mark on pile 1 and a high mark just past the last pile in use.",
        codeLine: 4,
        state: draw(nums, { tops, dealt: index, itemTones: { [index]: "edge" }, pointers: [{ at: 0, label: "low" }, { at: size, label: "high" }], note: count(size) }),
      });
      for (const look of looks) {
        frames.push({
          scene,
          caption: `Look at the middle pile between the marks: pile ${look.mid + 1}, top ${tops[look.mid]}. ${
            look.smaller ? `${tops[look.mid]} is smaller than ${card}, so the card goes further right. The low mark moves past it.` : `${tops[look.mid]} is not smaller than ${card}, so the card goes here or further left. The high mark moves here.`
          }`,
          codeLine: look.smaller ? 8 : 10,
          state: draw(nums, {
            tops,
            dealt: index,
            itemTones: { [index]: "edge" },
            stoneTones: { [look.mid]: "window" },
            pointers: [{ at: look.low, label: "low" }, { at: look.mid, label: "mid" }, { at: look.high, label: "high" }],
            note: count(size),
          }),
        });
      }
      frames.push({ scene, caption: `The two marks meet on pile ${pile + 1}. ${placedCaption(item)}`, codeLine: 13, state: { ...landed(), pointers: [{ at: pile, label: "low" }, { at: pile, label: "high" }] } });
    } else if (looks.length > 0) {
      frames.push({
        scene,
        caption: `Halving between the marks finds pile ${pile + 1} in ${plural(looks.length, "look")}. ${placedCaption(item)}`,
        codeLine: 13,
        state: { ...landed(), pointers: [{ at: pile, label: "low" }, { at: pile, label: "high" }] },
      });
    } else {
      frames.push({ scene, caption: placedCaption(item), codeLine: 13, state: landed() });
    }

    if (item.grew && !practice) {
      frames.push({
        scene,
        caption: `A new pile means a longer chain exists. The pile count is now ${size + 1}.`,
        codeLine: line(15),
        state: draw(nums, { tops: after, dealt: index + 1, stoneTones: { [pile]: "done" }, note: count(size + 1) }),
      });
    }
  }

  const size = finalTops.length;
  const all = nums.length;
  const problem = topsProblem(nums, finalTops);
  const chain = longestChain(nums);
  const chainValues = chain.map((position) => nums[position]).join(", ");
  const why = problem ? (problem.literal ? `${problem.missing} never comes after ${problem.before} in the cards` : `the cards were not dealt in that order`) : "";
  const trapState = draw(nums, { tops: finalTops, stoneTones: tonesAt([...finalTops.keys()], "miss"), itemTones: tonesAt(chain, "done"), note: count(size), trap: `tops ${finalTops.join(", ")}: not a chain · a real chain: ${chainValues}` });

  if (practice) {
    if (problem) {
      frames.push({
        scene,
        caption: `All cards are dealt, and ${plural(size, "pile")} are in use. The tops read ${finalTops.join(", ")}.`,
        state: draw(nums, { tops: finalTops, dealt: all, note: count(size) }),
        quiz: {
          kind: "choice",
          question: `Is ${finalTops.join(", ")} a rising chain you can find in the cards, in that order?`,
          options: ["Yes, the tops are the chain", "No, the tops only count the piles"],
          answer: 1,
          why: "A top may be a late, small card that took the place of an older one. The tops only tell the length.",
        },
      });
      frames.push({ scene, caption: `No. That is the Pile Tops Trap: ${why}. A real chain is ${chainValues}, and only the pile count is the answer.`, state: trapState });
    }
    frames.push({ scene, caption: `Done. ${plural(size, "pile")}, so the answer is ${size}. You placed every card yourself.`, state: draw(nums, { tops: finalTops, dealt: all, stoneTones: tonesAt([...finalTops.keys()], "done"), note: count(size) }) });
    return frames;
  }

  frames.push({
    scene,
    caption: `All cards are dealt. ${plural(size, "pile")} ${size === 1 ? "is" : "are"} in use, so the longest rising chain has ${plural(size, "card")}. The answer is ${size}.`,
    codeLine: 18,
    state: draw(nums, { tops: finalTops, dealt: all, stoneTones: tonesAt([...finalTops.keys()], "done"), note: count(size) }),
  });
  if (problem) {
    frames.push({
      scene,
      caption: `The Pile Tops Trap: reading the tops ${finalTops.join(", ")} as the chain. But ${why}. A real chain is ${chainValues}.`,
      codeLine: 13,
      state: trapState,
    });
    frames.push({
      scene,
      caption: "A top can be a late, small card that took an older card's place. The tops tell how long the chain is, never which cards are in it.",
      codeLine: 18,
      state: trapState,
    });
  }
  frames.push({
    scene,
    caption: `Time: O(n log n). Each of the ${plural(all, "card")} found its pile by halving: ${plural(totalLooks, "look")} at a top in all. The slow way made ${slowChoices} choices.`,
    codeLine: 5,
    state: draw(nums, { tops: finalTops, dealt: all, note: count(size), counter: { label: "tops looked at", value: String(totalLooks) } }),
  });
  frames.push({
    scene,
    caption: `Space: O(n). There is room for one top per card: ${plural(all, "pile")} at most. Here ${size} ${size === 1 ? "is" : "are"} in use.`,
    codeLine: 0,
    state: draw(nums, { tops: finalTops, dealt: all, stoneTones: tonesAt([...nums.keys()], "done"), note: count(size) }),
  });
  return frames;
}

export const longestIncreasingSubsequenceStory: ProblemStory<StonesState> = {
  slugs: ["lc-300"],
  pattern: "Patience sorting",
  trigger: "“length of the longest strictly increasing subsequence” of an array",
  insight: "Deal the numbers as cards onto piles. Each card goes on the leftmost pile whose top is not smaller; a card bigger than every top starts a new pile. The pile count is the answer.",
  metaphor: {
    name: "The pile tops",
    legend: "pile k = tails[k - 1] · top = the number kept there · card = x · pile count = size · the low and high marks = low, high",
    terms: ["pile", "top", "card"],
  },
  traps: [{ name: "The Pile Tops Trap", rule: "The tops are not the chain. A top may be a late, small card that replaced an older one. tails only gives the length: return size." }],
  template: [
    "tops = empty row;",
    "for (each x)",
    "    p = leftmost pile whose top >= x   // binary search",
    "    put x on pile p, or start a new pile if there is none;",
    "return number of piles;",
  ],
  complexity: {
    slow: "O(2^n)",
    time: "O(n log n)",
    timeWhy: "each card finds its pile by halving a sorted row of tops",
    space: "O(n)",
    spaceWhy: "one top per pile, and never more piles than cards",
  },
  code: CODE,
  examples: [
    { label: "[10,9,2,5,3,7,101,18]", input: "nums=[10,9,2,5,3,7,101,18]", expected: "4" },
    { label: "[4,5,6,1,2]", input: "nums=[4,5,6,1,2]", expected: "3", note: "The tops are not a real chain here" },
    { label: "[0,1,0,3,2,3]", input: "nums=[0,1,0,3,2,3]", expected: "4" },
    { label: "[7,7,7,7]", input: "nums=[7,7,7,7]", expected: "1", note: "Equal numbers do not rise" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-322", title: "Coin Change" },
    { slug: "lc-1143", title: "Longest Common Subsequence" },
    { slug: "lc-139", title: "Word Break" },
  ],
  answer: (raw) => String(longestChain(parseInput(raw)).length),
  frames: (raw) => {
    const nums = parseInput(raw);
    const slow = runSlow(nums);
    const practice = parseInput(PRACTICE);
    const { deals, tops } = deal(nums);
    return [
      ...pictureFrames(nums, longestChain(nums)),
      ...slowFrames(nums, slow),
      ...insightFrames(nums, deals),
      ...dealFrames(nums, "solution", false, slow.capped ? `more than ${SLOW_CAP}` : String(slow.choices)),
      ...dealFrames(practice, "card", true, ""),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: draw(nums, { tops, dealt: nums.length, stoneTones: tonesAt([...tops.keys()], "done"), note: `piles: ${tops.length}` }),
      },
    ];
  },
  View: AgyDp2StonesView,
};
