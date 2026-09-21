import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokScaleView, type GrokScaleGroup, type GrokScaleState } from "../grok-scale-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<GrokScaleState>;

const PRACTICE = "1000010";

const BELOW_TWENTY = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const SCALES = ["", "Thousand", "Million", "Billion"];

const CODE = [
  "if (num == 0) return \"Zero\";",
  "StringBuilder out = new StringBuilder();",
  "int scale = 0;",
  "while (num > 0) {",
  "    int group = num % 1000;",
  "    if (group != 0) {",
  "        StringBuilder part = new StringBuilder(spell(group));",
  "        if (!SCALES[scale].isEmpty()) part.append(' ').append(SCALES[scale]);",
  "        if (out.length() > 0) part.append(' ').append(out);",
  "        out = part;",
  "    }",
  "    num /= 1000;",
  "    scale++;",
  "}",
  "return out.toString();",
];

function parse(raw: string): number {
  return Number(raw.trim().replace(/,/g, ""));
}

function spell(value: number): string {
  if (value === 0) return "";
  if (value < 20) return BELOW_TWENTY[value];
  if (value < 100) {
    const rest = spell(value % 10);
    return TENS[Math.floor(value / 10)] + (rest ? ` ${rest}` : "");
  }
  const rest = spell(value % 100);
  return `${BELOW_TWENTY[Math.floor(value / 100)]} Hundred${rest ? ` ${rest}` : ""}`;
}

function toWords(num0: number): string {
  if (num0 === 0) return "Zero";
  const parts: string[] = [];
  let num = num0;
  let scale = 0;
  while (num > 0) {
    const group = num % 1000;
    if (group !== 0) {
      const piece = spell(group) + (SCALES[scale] ? ` ${SCALES[scale]}` : "");
      parts.unshift(piece);
    }
    num = Math.floor(num / 1000);
    scale++;
  }
  return parts.join(" ");
}

function groupsOf(num0: number): GrokScaleGroup[] {
  if (num0 === 0) return [{ digits: "000", scale: "ones", spelled: "Zero", skipped: false, tone: "done" }];
  const groups: GrokScaleGroup[] = [];
  let num = num0;
  let scale = 0;
  while (num > 0 || groups.length === 0) {
    const group = num % 1000;
    const digits = String(group).padStart(3, "0");
    groups.unshift({
      digits,
      scale: SCALES[scale] || "ones",
      spelled: group === 0 ? "" : spell(group),
      skipped: group === 0,
      tone: group === 0 ? "miss" : "idle",
    });
    num = Math.floor(num / 1000);
    scale++;
    if (scale > 3) break;
  }
  return groups;
}

function blank(groups: GrokScaleGroup[], spoken = ""): GrokScaleState {
  return { groups: groups.map((g) => ({ ...g })), here: null, spoken, note: null, trapNote: null, counter: null };
}

function pictureFrames(num: number): Frame[] {
  const groups = groupsOf(num);
  const words = toWords(num);
  const zero = groups.find((g) => g.skipped);
  return [
    { scene: "picture", caption: `The number is ${num}. We spell it in English, with no extra spaces.`, state: blank(groups) },
    {
      scene: "picture",
      caption: `Split it into groups of three digits: ${groups.map((g) => g.digits).join(" ")}.`,
      state: blank(groups),
    },
    zero
      ? {
          scene: "picture",
          caption: `A group of 000 is not the word Zero. Skip that scale entirely.`,
          state: { ...blank(groups), trapNote: "skip a zero group", here: groups.indexOf(zero) },
        }
      : {
          scene: "picture",
          caption: "Every group here is non-zero, so each scale is spoken.",
          state: blank(groups),
        },
    {
      scene: "picture",
      caption: `The goal: the English words. Here they are "${words}".`,
      state: { ...blank(groups, words), groups: groups.map((g) => ({ ...g, tone: (g.skipped ? "miss" : "done") as CellTone })) },
    },
  ];
}

function slowFrames(num: number): Frame[] {
  const groups = groupsOf(num);
  const frames: Frame[] = [];
  let looks = 0;
  const s = String(num);
  for (let i = 0; i < s.length && frames.length < 3; i++) {
    looks++;
    frames.push({
      scene: "slow",
      caption: i === 0 ? "The slow way: write a branch for every place value, digit by digit from the left." : `Look at digit ${s[i]} and pick a place-value word.`,
      state: { ...blank(groups), counter: { label: "digits looked at", value: String(looks) } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `We looked at ${s.length} digits with a long list of place words. Easy to get wrong. Time is still O(1) for a 32-bit int, but the code is huge.`,
    state: { ...blank(groups, toWords(num)), counter: { label: "digits looked at", value: String(s.length) } },
  });
  return frames;
}

function insightFrames(num: number): Frame[] {
  const groups = groupsOf(num);
  const zeroAt = groups.findIndex((g) => g.skipped);
  return [
    {
      scene: "insight",
      caption: "Picture groups of three. Spell a group below 1000 with one helper, then attach Thousand, Million, or Billion.",
      state: blank(groups),
    },
    {
      scene: "insight",
      caption: zeroAt >= 0
        ? `The ${groups[zeroAt].scale} group is 000. Skip it. Do not say Zero ${groups[zeroAt].scale}.`
        : "If a group is not zero, spell it and keep the scale word.",
      state: { ...blank(groups), here: zeroAt >= 0 ? zeroAt : 0 },
    },
    {
      scene: "insight",
      caption: "The Zero Group Trap would speak Zero Thousand in a hole. If the three digits are 0, add nothing.",
      state: { ...blank(groups), trapNote: "The Zero Group Trap", here: zeroAt >= 0 ? zeroAt : null },
    },
  ];
}

function skipQuiz(): StoryQuiz {
  return {
    kind: "choice",
    question: "This group of three digits is 000. What do we add to the words?",
    options: ["The words Zero and the scale, like Zero Thousand", "Nothing. Skip this scale entirely"],
    answer: 1,
    why: "The Zero Group Trap speaks Zero Thousand in a hole. A zero group adds nothing.",
  };
}

function groupQuiz(groups: GrokScaleGroup[], index: number): StoryQuiz {
  const feedback: Record<number, string> = {};
  groups.forEach((g, i) => {
    if (i === index) return;
    feedback[i] = g.skipped ? "That group is zero and is skipped." : "Peel groups from the right: ones, then thousands, then millions.";
  });
  return {
    kind: "cell",
    cells: groups.length,
    question: "Which group do we peel next? Click that group.",
    answer: index,
    feedback,
    otherwise: "Peel three digits at a time, starting from the ones.",
    why: "Take num modulo 1000, spell that group if it is not zero, then divide by 1000.",
  };
}

function solutionFrames(num0: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const groups = groupsOf(num0);
  let askedSkip = false;
  let askedGroup = false;
  let spoken = "";
  let num = num0;
  let scale = 0;

  frames.push({
    scene,
    caption: practice ? `Your turn, on a new number: ${num0}. Skip any zero group.` : num0 === 0 ? "Zero is the word Zero, not an empty string." : "Peel groups of three from the right.",
    codeLine: line(num0 === 0 ? 0 : 3),
    state: blank(groups),
  });

  if (num0 === 0) {
    frames.push({
      scene,
      caption: practice ? "Done. The answer is Zero." : "The answer is Zero.",
      codeLine: line(0),
      state: { ...blank(groups, "Zero") },
    });
  } else {
    const order = [...groups].reverse();
    for (let step = 0; step < order.length; step++) {
      const group = num % 1000;
      const visualIndex = groups.length - 1 - step;
      const look: Frame = {
        scene,
        caption: `Peel the ${SCALES[scale] || "ones"} group: ${String(group).padStart(3, "0")}.`,
        codeLine: line(4),
        state: { ...blank(groups, spoken), here: visualIndex },
      };
      if (practice || !askedGroup) {
        askedGroup = true;
        look.quiz = groupQuiz(groups, visualIndex);
      }
      frames.push(look);

      if (group === 0) {
        const skip: Frame = {
          scene,
          caption: "This group is 000.",
          codeLine: line(5),
          state: { ...blank(groups, spoken), here: visualIndex, trapNote: "The Zero Group Trap" },
        };
        if (practice || !askedSkip) {
          askedSkip = true;
          skip.quiz = skipQuiz();
        }
        frames.push(skip);
        frames.push({
          scene,
          caption: "The Zero Group Trap would say Zero and the scale. Skip it. Add nothing.",
          codeLine: line(5),
          state: { ...blank(groups.map((g, i) => (i === visualIndex ? { ...g, tone: "miss" as CellTone, skipped: true } : g)), spoken), here: visualIndex },
        });
      } else {
        const piece = spell(group) + (SCALES[scale] ? ` ${SCALES[scale]}` : "");
        spoken = spoken ? `${piece} ${spoken}` : piece;
        frames.push({
          scene,
          caption: `Spell it: ${piece}. Put it in front of the words so far.`,
          codeLine: line(6),
          state: { ...blank(groups.map((g, i) => (i === visualIndex ? { ...g, tone: "done" as CellTone } : g)), spoken), here: visualIndex },
        });
      }
      num = Math.floor(num / 1000);
      scale++;
    }
    frames.push({
      scene,
      caption: practice ? `Done. The answer is ${spoken}. You skipped the holes.` : `The answer is ${spoken}.`,
      codeLine: line(14),
      state: { ...blank(groups, spoken) },
    });
  }

  if (!practice) {
    frames.push({
      scene,
      caption: "Time: O(1). At most four groups of three digits for a 32-bit int.",
      codeLine: 3,
      state: { ...blank(groups, toWords(num0)), counter: { label: "groups", value: String(groups.length) } },
    });
    frames.push({
      scene,
      caption: "Space: O(1). Fixed word tables, and the built string is bounded by a 32-bit int.",
      codeLine: 1,
      state: { ...blank(groups, toWords(num0)), counter: { label: "tables", value: "3" } },
    });
  }
  return frames;
}

export const integerToEnglishStory: ProblemStory<GrokScaleState> = {
  slugs: ["lc-273"],
  pattern: "Digit grouping",
  trigger: "convert a non-negative integer into English words",
  insight: "Split the number into groups of three. Spell each non-zero group with one helper, and skip a group that is zero.",
  metaphor: { name: "Groups of three", legend: "group = num % 1000 · scale = Thousand/Million/Billion · skip = a zero group", terms: ["group", "scale", "skip", "spell"] },
  traps: [
    {
      name: "The Zero Group Trap",
      rule: "If the three digits are 0, add nothing. Do not speak Zero Thousand.",
    },
  ],
  template: [
    "if num is 0: return Zero",
    "while num > 0:",
    "    group = num % 1000",
    "    if group != 0: spell it and add the scale in front",
    "    num = num / 1000",
  ],
  complexity: {
    slow: "O(1)",
    time: "O(1)",
    timeWhy: "at most four groups of three digits",
    space: "O(1)",
    spaceWhy: "fixed word tables, and the built string is bounded by a 32-bit int",
  },
  code: CODE,
  examples: [
    { label: "123", input: "123", expected: "One Hundred Twenty Three" },
    { label: "100", input: "100", expected: "One Hundred" },
    { label: "1000000", input: "1000000", expected: "One Million" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-8", title: "String to Integer (atoi)" },
    { slug: "lc-43", title: "Multiply Strings" },
    { slug: "lc-50", title: "Pow(x, n)" },
  ],
  answer: (input) => toWords(parse(input)),
  frames: (input) => {
    const num = parse(input);
    const groups = groupsOf(num);
    return [
      ...pictureFrames(num),
      ...slowFrames(num),
      ...insightFrames(num),
      ...solutionFrames(num),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(groups, toWords(num)) },
      },
    ];
  },
  View: GrokScaleView,
};
