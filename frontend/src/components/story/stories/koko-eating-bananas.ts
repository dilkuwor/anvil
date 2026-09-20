import { DIAL_CLICK_LIMIT, KokoEatingView, type KokoEatingState } from "../koko-eating-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type DialFrame = StoryFrame<KokoEatingState>;

/** Fresh piles for the "your turn" run. At the first try the all-in-one division says "in time" and is wrong. */
const PRACTICE = "piles=[4,9,5,12], h=5";
const FALLBACK = { piles: [3, 6, 7, 11], h: 8 };

const CODE = [
  "int low = 1, high = 1;",
  "for (int p : piles) high = Math.max(high, p);",
  "while (low < high) {",
  "    int mid = low + (high - low) / 2;",
  "    long hours = 0;",
  "    for (int p : piles) hours += (p + mid - 1) / mid;   // whole hours per pile",
  "    if (hours <= h) high = mid;",
  "    else low = mid + 1;",
  "}",
  "return low;",
];

function parseInput(raw: string): { piles: number[]; h: number } {
  const list = raw.match(/\[([^\]]*)\]/);
  const limit = raw.match(/h\s*=\s*(\d+)/);
  const piles = (list?.[1].match(/\d+/g) ?? []).map(Number).filter((pile) => pile > 0);
  if (piles.length === 0 || !limit) return FALLBACK;
  // Below one hour per pile nothing can work, so the story never goes there.
  return { piles, h: Math.max(Number(limit[1]), piles.length) };
}

const hoursPerPile = (piles: number[], speed: number) => piles.map((pile) => Math.ceil(pile / speed));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const oneDecimal = (value: number) => String(Math.round(value * 10) / 10);
const hourWord = (count: number) => (count === 1 ? "hour" : "hours");

type Try = { low: number; high: number; mid: number; hours: number[]; total: number; works: boolean };

/** The real algorithm, recorded one try at a time. */
function solve(piles: number[], h: number): { answer: number; tries: Try[] } {
  const tries: Try[] = [];
  let low = 1;
  let high = Math.max(1, ...piles);
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    const hours = hoursPerPile(piles, mid);
    const total = sum(hours);
    tries.push({ low, high, mid, hours, total, works: total <= h });
    if (total <= h) high = mid;
    else low = mid + 1;
  }
  return { answer: low, tries };
}

/** "1 + 2 + 2 + 3 = 8 hours", or just the total when there are too many piles to read. */
function spelled(hours: number[]): string {
  const total = sum(hours);
  return hours.length <= 6 ? `${hours.join(" + ")} = ${total} ${hourWord(total)}` : `${total} ${hourWord(total)} in all`;
}

function blank(piles: number[], h: number): KokoEatingState {
  return { piles, h, speed: null, low: null, high: null, hours: null };
}

function pictureFrames(piles: number[], h: number, answer: number): DialFrame[] {
  const listed = piles.length > 1 ? `${piles.slice(0, -1).join(", ")} and ${piles.at(-1)}` : String(piles[0]);
  const hours = hoursPerPile(piles, answer);
  const uneven = piles.find((pile) => pile % answer !== 0 && pile > answer);
  const small = piles.some((pile) => pile < answer) ? Math.min(...piles) : undefined;
  const notAllowed = "Not allowed: finishing a pile early and using the rest of that hour on another pile.";
  return [
    { scene: "picture", caption: `Koko has ${piles.length} piles of bananas: ${listed}. The guards come back in ${h} hours.`, state: blank(piles, h) },
    {
      scene: "picture",
      caption: `She picks one eating speed and keeps it, say ${answer} bananas an hour. Each hour she sits at one pile and eats up to ${answer} from it.`,
      state: { ...blank(piles, h), speed: answer },
    },
    {
      scene: "picture",
      caption:
        uneven !== undefined
          ? `${notAllowed} So the pile of ${uneven} costs ${Math.ceil(uneven / answer)} whole hours at speed ${answer}.`
          : small !== undefined
            ? `${notAllowed} So even the small pile of ${small} costs one whole hour at speed ${answer}.`
            : `${notAllowed} Every pile costs whole hours.`,
      state: { ...blank(piles, h), speed: answer, hours },
    },
    {
      scene: "picture",
      caption: `The goal: the slowest speed that still finishes every pile before the guards are back. Here that is ${answer}: ${spelled(hours)}.`,
      state: { ...blank(piles, h), speed: answer, hours, verdict: "works" },
    },
  ];
}

/** The obvious way, really run: try speed 1, then 2, then 3… until one works. */
function slowFrames(piles: number[], h: number): DialFrame[] {
  const frames: DialFrame[] = [];
  const top = Math.max(1, ...piles);
  let tried = 0;
  for (let speed = 1; speed <= top; speed++) {
    tried += 1;
    const hours = hoursPerPile(piles, speed);
    const works = sum(hours) <= h;
    if (speed <= 2 || works) {
      const skipped = works && speed > 3;
      let caption: string;
      if (works) caption = `${skipped ? "And so on, one speed at a time. " : ""}Speed ${speed} is the first that works: ${spelled(hours)}. That took ${tried} ${tried === 1 ? "try" : "tries"}.`;
      else if (speed === 1) caption = `The slow way: try speed 1, then 2, then 3. At speed 1 the piles cost ${spelled(hours)}. Too slow.`;
      else caption = `Speed ${speed}: ${spelled(hours)}. Still too slow.`;
      frames.push({ scene: "slow", caption, state: { ...blank(piles, h), speed, hours, verdict: works ? "works" : "slow", counter: { label: "speeds tried", value: tried } } });
    }
    if (works) break;
  }
  frames.push({
    scene: "slow",
    caption: "A pile can hold a billion bananas, so this can mean a billion tries, each one walking all n piles. That is O(n · m) time, where m is the biggest pile.",
    state: { ...blank(piles, h), counter: { label: "speeds tried", value: tried } },
  });
  return frames;
}

function insightFrames(piles: number[], h: number, answer: number): DialFrame[] {
  const top = Math.max(1, ...piles);
  return [
    {
      scene: "insight",
      caption: `Lay every possible speed on a dial, from 1 up to ${top}, the biggest pile. Going faster than ${top} is pointless: every pile already costs just one hour.`,
      state: { ...blank(piles, h), low: 1, high: top },
    },
    {
      scene: "insight",
      caption: "The key: if a speed is too slow, every slower speed is too slow as well. If a speed works, every faster speed works too.",
      state: { ...blank(piles, h), zones: { firstWorks: answer } },
    },
    {
      scene: "insight",
      caption: "So the dial is one stretch of too slow, then one stretch of works. We want the first speed that works. Try the middle of the dial, and half of it can go.",
      state: { ...blank(piles, h), zones: { firstWorks: answer }, speed: 1 + Math.floor((top - 1) / 2) },
    },
  ];
}

function sideQuiz(attempt: Try, h: number): StoryQuiz {
  const { mid, total, works } = attempt;
  return {
    kind: "choice",
    question: `Speed ${mid} takes ${total} ${hourWord(total)}, and the guards are back in ${h}. Koko wants the slowest speed that works. Which part of the dial can go?`,
    options: [`The slow side: ${mid} and everything slower`, `The fast side: everything faster than ${mid}`],
    answer: works ? 1 : 0,
    why: works
      ? `${mid} works, so anything faster is never needed. But ${mid} itself stays: it may be the answer.`
      : `${mid} is too slow, so every slower speed is too slow as well. ${mid} itself goes with them.`,
  };
}

function dialQuiz(attempt: Try, h: number, top: number): StoryQuiz {
  const { low, high, mid, works } = attempt;
  const answerSpeed = works ? mid : mid + 1;
  const feedback: Record<number, string> = {};
  for (let speed = 1; speed <= top; speed++) {
    if (speed === answerSpeed) continue;
    let text: string;
    if (speed < low || speed > high) text = "That part of the dial was already thrown away.";
    else if (works && speed > mid) text = `The needle's speed already works, and Koko wants the slowest. Nothing faster than the needle needs to stay.`;
    else if (works) text = "The needle's speed works, so it may be the answer. Jumping past it would throw it away.";
    else if (speed === mid) text = "The needle's speed was just tried and is too slow. It must go as well.";
    else if (speed < mid) text = "Slower than the needle is too slow as well. The end must clear everything we know fails.";
    else text = "That throws away speeds nobody has tried. One of them may be the slowest that works.";
    feedback[speed - 1] = text;
  }
  return {
    kind: "cell",
    cells: top,
    question: `The guards are back in ${h} hours. One end of the dial must jump. Click the speed it lands on.`,
    answer: answerSpeed - 1,
    feedback,
    otherwise: "Throw away only the speeds you are sure about, and keep all the rest.",
    why: works
      ? `It works, so nothing faster is needed. The fast end jumps onto the needle, which may still be the answer.`
      : `Too slow, so the needle and everything slower go. The slow end lands one step past the needle.`,
  };
}

function wholeHourQuiz(piles: number[], mid: number): StoryQuiz | null {
  const pile = piles.find((value) => value % mid !== 0 && value > mid) ?? piles.find((value) => value % mid !== 0);
  if (pile === undefined) return null;
  const whole = Math.ceil(pile / mid);
  const right = `${whole} whole ${hourWord(whole)}: she waits out the rest of the last hour`;
  const wrong = `Less than ${whole}: she spends the rest of that hour on the next pile`;
  const rightFirst = mid % 2 === 0;
  return {
    kind: "choice",
    question: `At speed ${mid}, the pile of ${pile} ends with a short hour of only ${pile % mid}. What does that pile cost Koko?`,
    options: rightFirst ? [right, wrong] : [wrong, right],
    answer: rightFirst ? 0 : 1,
    why: "Koko never shares an hour between two piles. Every pile is rounded up to whole hours on its own.",
  };
}

/**
 * The real algorithm, one frame per change. `practice` reuses it on fresh piles:
 * fewer frames, no code, and the reader makes every decision.
 */
function solutionFrames(piles: number[], h: number, scene: SceneId = "solution", practice = false): DialFrame[] {
  const frames: DialFrame[] = [];
  const top = Math.max(1, ...piles);
  const all = sum(piles);
  const { answer, tries } = solve(piles, h);
  const line = (index: number) => (practice ? undefined : index);
  const clickable = top <= DIAL_CLICK_LIMIT;
  let best: number | null = null;
  const asked = { works: false, slow: false };

  // The trap is shown where it hurts most: a try where the all-in-one division says "in time" and is wrong.
  const fooled = (attempt: Try) => all / attempt.mid <= h && !attempt.works;
  const differs = (attempt: Try) => all / attempt.mid !== attempt.total;
  const trapTry = tries.find(fooled) ?? tries.find(differs) ?? null;

  frames.push({
    scene,
    caption: practice
      ? `Your turn, with new piles and ${h} hours. You count the hours, and you move the ends of the dial.`
      : `The dial starts wide open. Its slow end is 1. Its fast end is ${top}, the biggest pile.`,
    codeLine: line(1),
    state: { ...blank(piles, h), low: 1, high: top },
  });

  tries.forEach((attempt, position) => {
    const { low, high, mid, hours, total, works } = attempt;
    const open: KokoEatingState = { ...blank(piles, h), low, high, speed: mid, best };
    const counted: KokoEatingState = { ...open, hours };
    const isTrap = attempt === trapTry;
    const wrong = { total: all, speed: mid, hours: oneDecimal(all / mid) };
    const needle = position === 0 ? `The needle points at the middle of the dial: speed ${mid}.` : `The needle moves to the middle of what is left: speed ${mid}.`;

    if (practice) {
      const rounding = isTrap ? wholeHourQuiz(piles, mid) : null;
      if (rounding) frames.push({ scene, caption: needle, state: open, quiz: rounding });
      const count: DialFrame = {
        scene,
        caption: rounding
          ? `Whole hours only: ${spelled(hours)}. Dividing all ${all} bananas by ${mid} would say ${wrong.hours}. That is the Fractional Speed Trap.`
          : `${needle} The piles cost ${spelled(hours)}.`,
        state: rounding ? { ...counted, wrong } : counted,
        quiz: clickable ? dialQuiz(attempt, h, top) : sideQuiz(attempt, h),
      };
      frames.push(count);
    } else {
      if (position === 0) {
        frames.push({ scene, caption: needle, codeLine: 3, state: open });
        frames.push({ scene, caption: `With the needle at ${mid}, every pile costs whole hours: ${spelled(hours)}.`, codeLine: 5, state: counted });
      } else {
        frames.push({ scene, caption: `${needle} The piles cost ${spelled(hours)}.`, codeLine: 5, state: counted });
      }
      if (isTrap) {
        frames.push({
          scene,
          caption: fooled(attempt)
            ? `The Fractional Speed Trap: all ${all} bananas divided by ${mid} looks like ${wrong.hours} hours, in time. But each pile costs whole hours, so it is really ${total}.`
            : `The Fractional Speed Trap: all ${all} bananas divided by ${mid} looks like ${wrong.hours} hours. Wrong: Koko never shares an hour between piles, so it is really ${total}.`,
          codeLine: 5,
          state: { ...counted, wrong },
        });
      }
      const verdict: DialFrame = {
        scene,
        caption: works
          ? `${total} ${hourWord(total)} fits in the ${h} Koko has. The needle's speed ${mid} works.`
          : `${total} hours is more than the ${h} Koko has. The needle's speed ${mid} is too slow.`,
        codeLine: 6,
        state: { ...counted, verdict: works ? "works" : "slow" },
      };
      if (!asked[works ? "works" : "slow"]) {
        asked[works ? "works" : "slow"] = true;
        verdict.quiz = sideQuiz(attempt, h);
      }
      frames.push(verdict);
    }

    const after: KokoEatingState = { ...blank(piles, h), low: works ? low : mid + 1, high: works ? mid : high, speed: null, best };
    frames.push({
      scene,
      caption: works
        ? `${practice ? `${total} ${hourWord(total)} is in time. ` : ""}Anything faster works too, but Koko wants the slowest. The fast end of the dial jumps onto the needle, ${mid}.`
        : `${practice ? `${total} hours is too slow. ` : ""}Anything slower is too slow as well. The slow end of the dial jumps just past the needle, to ${mid + 1}.`,
      codeLine: line(works ? 6 : 7),
      state: after,
    });
    if (works) {
      best = mid;
      frames.push({
        scene,
        caption: `Speed ${mid} is the fastest we ever need: the best so far. The answer is ${mid} or something slower on the dial.`,
        codeLine: line(6),
        state: { ...after, best },
      });
    }
  });

  const finalHours = hoursPerPile(piles, answer);
  const closed: KokoEatingState = { ...blank(piles, h), low: answer, high: answer, speed: answer, hours: finalHours, verdict: "works", best: answer };
  frames.push({
    scene,
    caption: `${practice ? "Done. " : ""}The two ends of the dial meet at ${answer}. Everything slower was too slow, so the answer is ${answer}: ${spelled(finalHours)}.`,
    codeLine: line(9),
    state: closed,
  });

  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n log m). The dial has m = ${top} speeds, but halving it took only ${tries.length} ${tries.length === 1 ? "try" : "tries"}. Each try walks the ${piles.length} piles once.`,
      codeLine: 3,
      state: { ...closed, counter: { label: "speeds tried", value: tries.length } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Only the two ends of the dial, the needle and one hour count are stored. Nothing grows with the piles.",
      codeLine: 0,
      state: { ...blank(piles, h), low: answer, high: answer, speed: answer },
    });
  }
  return frames;
}

export const kokoEatingBananasStory: ProblemStory<KokoEatingState> = {
  slugs: ["lc-875"],
  pattern: "Binary search on the answer",
  trigger: "“the smallest speed (or size, or capacity) that still finishes in time”, where checking one candidate is easy",
  insight: "Lay all speeds on a dial. Too slow stays too slow below, works stays works above. Try the middle, throw half the dial away, and close in on the first speed that works.",
  metaphor: {
    name: "The speed dial",
    legend: "slow end = low · fast end = high · needle = mid, the speed being tried · whole hours = (p + mid - 1) / mid per pile",
    terms: ["dial", "needle", "slow end", "fast end"],
  },
  traps: [
    {
      name: "The Fractional Speed Trap",
      rule: "Koko never shares an hour between two piles. Round each pile up on its own: (p + k - 1) / k. Never divide the sum of all piles by k.",
    },
  ],
  template: [
    "low = smallest possible answer; high = largest possible answer;",
    "while (low < high) {",
    "    mid = the middle of low..high;",
    "    if (mid is good enough) high = mid;      // keep mid, it may be the answer",
    "    else low = mid + 1;                       // mid and everything below fail",
    "}",
    "return low;",
  ],
  complexity: {
    slow: "O(n · m)",
    time: "O(n log m)",
    timeWhy: "halving a dial of m speeds takes about log m tries, and each try walks the n piles once",
    space: "O(1)",
    spaceWhy: "only low, high, mid and one hour count are stored",
  },
  code: CODE,
  examples: [
    { label: "piles=[3,6,7,11], h=8", input: "piles=[3,6,7,11], h=8", expected: "4" },
    { label: "piles=[30,11,23,4,20], h=5", input: "piles=[30,11,23,4,20], h=5", expected: "30", note: "One hour per pile: only the top speed works" },
    { label: "piles=[30,11,23,4,20], h=6", input: "piles=[30,11,23,4,20], h=6", expected: "23" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-1011", title: "Capacity To Ship Packages Within D Days" },
    { slug: "lc-278", title: "First Bad Version" },
    { slug: "lc-704", title: "Binary Search" },
  ],
  answer: (input) => {
    const { piles, h } = parseInput(input);
    return String(solve(piles, h).answer);
  },
  frames: (input) => {
    const { piles, h } = parseInput(input);
    const practice = parseInput(PRACTICE);
    const { answer } = solve(piles, h);
    return [
      ...pictureFrames(piles, h, answer),
      ...slowFrames(piles, h),
      ...insightFrames(piles, h, answer),
      ...solutionFrames(piles, h),
      ...solutionFrames(practice.piles, practice.h, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember: a dial of speeds, too slow on one side, fast enough on the other. Say the idea in your head first, then reveal the card.",
        state: { ...blank(piles, h), zones: { firstWorks: answer }, speed: answer },
      },
    ];
  },
  View: KokoEatingView,
};
