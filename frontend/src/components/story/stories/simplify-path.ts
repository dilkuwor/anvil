import type { CellTone } from "@/components/learn/viz/primitives";

import {
  GrokPlateStackView,
  nonePick,
  pickCount,
  topPlatePick,
  type Plate,
  type PlateStackState,
} from "../grok-plate-stack-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PlateStackState>;

const PRACTICE = '"/home/../../"';

const CODE = [
  "Deque<String> pile = new ArrayDeque<>();",
  "for (String part : path.split(\"/\")) {",
  "    if (part.isEmpty() || part.equals(\".\")) continue;",
  "    if (part.equals(\"..\")) {",
  "        if (!pile.isEmpty()) pile.removeFirst();",
  "    } else {",
  "        pile.addFirst(part);",
  "    }",
  "}",
  "StringBuilder out = new StringBuilder();",
  "Iterator<String> it = pile.descendingIterator();",
  "while (it.hasNext()) out.append('/').append(it.next());",
  "return out.length() == 0 ? \"/\" : out.toString();",
];

function parse(raw: string): string {
  const quoted = raw.match(/"([^"]*)"/);
  if (quoted) return quoted[1];
  return raw.trim().replace(/^path\s*=\s*/, "");
}

function partsOf(path: string): string[] {
  return path.split("/").filter((part) => part.length > 0);
}

function solve(path: string): string {
  const pile: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (pile.length > 0) pile.pop();
    } else pile.push(part);
  }
  return pile.length === 0 ? "/" : `/${pile.join("/")}`;
}

function tones(count: number, paint: (index: number) => CellTone | null): CellTone[] {
  return Array.from({ length: count }, (_, index) => paint(index) ?? "idle");
}

function platesOf(pile: string[], topTone?: CellTone): Plate[] {
  return pile.map((label, index) => ({ label, tone: index === pile.length - 1 ? topTone : "idle" }));
}

function blank(tokens: string[]): PlateStackState {
  return { tokens, tokenTones: tones(tokens.length, () => null), cursor: null, plates: [], stackTitle: "folder plates", floor: "/", floorTone: "done" };
}

function base(tokens: string[], pile: string[], cursor: number | null, extra: Partial<PlateStackState> = {}): PlateStackState {
  return {
    ...blank(tokens),
    cursor,
    plates: platesOf(pile),
    tokenTones: tones(tokens.length, (index) => (index === cursor ? "edge" : index < (cursor ?? -1) ? "faded" : null)),
    ...extra,
  };
}

function firstDotDot(tokens: string[]): number {
  const at = tokens.findIndex((part) => part === "..");
  return at < 0 ? 0 : at;
}

function upQuiz(state: PlateStackState, pile: string[]): StoryQuiz {
  const empty = pile.length === 0;
  const answer = empty ? nonePick(state) : topPlatePick(state);
  const feedback: Record<number, string> = {};
  state.tokens.forEach((_, index) => {
    if (index !== answer) feedback[index] = "That is a part of the path, not a folder plate.";
  });
  pile.forEach((label, fromBottom) => {
    const idx = state.tokens.length + (state.askNone ? 1 : 0) + fromBottom;
    if (idx === answer) return;
    feedback[idx] = `${label} is under the top folder. ".." takes only the top plate.`;
  });
  if (!empty) feedback[nonePick(state)] = "A folder plate is still on the pile. \"..\" takes that top folder.";
  return {
    kind: "cell",
    cells: pickCount(state),
    question: '".." arrived. Which folder plate leaves, or stay at root if the pile is empty?',
    answer,
    feedback,
    otherwise: "\"..\" takes the top folder plate, or stays if the pile is empty.",
    why: empty ? "The pile is empty, so we stay at the root floor. We never go above /." : "\"..\" takes the top folder plate, the last folder we entered.",
  };
}

function pictureFrames(path: string): Frame[] {
  const tokens = partsOf(path);
  const out = solve(path);
  const frames: Frame[] = [
    {
      scene: "picture",
      caption: "A Unix path is a pile of folder plates on a root floor. \".\" is stay. \"..\" takes the top folder.",
      state: blank(tokens),
    },
  ];
  if (tokens.includes("..") && tokens.findIndex((part) => part === "..") === 0) {
    frames.push({
      scene: "picture",
      caption: `".." at the start is not allowed to go above root. The floor stays /.`,
      state: { ...blank(tokens), cursor: 0, tokenTones: tones(tokens.length, (index) => (index === 0 ? "miss" : null)), xMark: true, floorTone: "miss" },
    });
  } else if (tokens.some((part) => part !== "." && part !== "..")) {
    const keep = tokens.filter((part) => part !== "." && part !== "..");
    frames.push({
      scene: "picture",
      caption: `A real folder name becomes a plate. "${keep[0]}" is allowed and sits on the root floor.`,
      state: { ...blank(tokens), plates: platesOf([keep[0]], "done") },
    });
  }
  frames.push({
    scene: "picture",
    caption: `The goal: the simplified path. Here that is ${out}.`,
    state: { ...blank(tokens), result: out, plates: platesOf(out === "/" ? [] : out.slice(1).split("/"), "done") },
  });
  return frames;
}

function slowFrames(path: string): Frame[] {
  const tokens = partsOf(path);
  const frames: Frame[] = [];
  let out = "";
  let copies = 0;
  let shown = 0;
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      const cut = out.lastIndexOf("/");
      const next = cut < 0 ? "" : out.slice(0, cut);
      copies += out.length;
      if (shown < 3) {
        frames.push({
          scene: "slow",
          caption:
            shown === 0
              ? `The slow way: keep the path as one string. ".." cuts back to the last slash. That copies what is left.`
              : `".." cuts "${out || "/"}" back to "${next || "/"}". Each cut copies the leftover string.`,
          state: { ...blank(tokens), result: next || "/", counter: { label: "chars copied", value: copies } },
        });
        shown++;
      }
      out = next;
    } else {
      out = `${out}/${part}`;
      copies += out.length;
      if (shown < 2) {
        frames.push({
          scene: "slow",
          caption: `Append /${part}. The growing string is now ${out}. Each append copies the path so far.`,
          state: { ...blank(tokens), result: out, plates: platesOf(out.slice(1).split("/"), "window"), counter: { label: "chars copied", value: copies } },
        });
        shown++;
      }
    }
  }
  const answer = out === "" ? "/" : out;
  frames.push({
    scene: "slow",
    caption: `Building a new string on every folder copied ${copies} characters. This is O(n²) time.`,
    state: { ...blank(tokens), result: answer, tokenTones: tones(tokens.length, () => "faded"), counter: { label: "chars copied", value: copies } },
  });
  return frames;
}

function insightFrames(path: string): Frame[] {
  const tokens = partsOf(path);
  const at = tokens.includes("..") ? firstDotDot(tokens) : 0;
  const pile: string[] = [];
  for (let i = 0; i < at; i++) {
    const part = tokens[i];
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (pile.length > 0) pile.pop();
    } else pile.push(part);
  }
  const empty = pile.length === 0;
  const hasUp = tokens.includes("..");
  return [
    {
      scene: "insight",
      caption: "Picture folder plates on a root floor. Each real name is a plate. The floor is / and it never leaves.",
      state: { ...blank(tokens), plates: platesOf(hasUp ? pile : tokens.filter((part) => part !== "." && part !== ".."), "window") },
    },
    {
      scene: "insight",
      caption: hasUp
        ? empty
          ? `".." has arrived and the pile is empty. The root floor is already there.`
          : `".." has arrived. It may take only the top folder plate.`
        : `A real folder sits on the floor. ".." would take that plate, but only if one is there.`,
      state: { ...base(tokens, hasUp ? pile : tokens.filter((part) => part !== "." && part !== ".."), hasUp ? at : 0, { held: hasUp ? ".." : undefined, askNone: hasUp }), plates: platesOf(hasUp ? pile : tokens.filter((part) => part !== "." && part !== ".."), "window") },
    },
    {
      scene: "insight",
      caption: empty || !hasUp
        ? `The Root Trap. Going above root is not allowed. An empty pile stays on the floor.`
        : `".." takes the top folder. We never set ".." down as a plate of its own.`,
      state: {
        ...base(tokens, pile, hasUp ? at : 0, { held: "..", heldTone: empty ? "miss" : "edge", xMark: empty || !hasUp, floorTone: empty || !hasUp ? "miss" : "done" }),
        plates: platesOf(pile, empty || !hasUp ? "miss" : "done"),
      },
    },
  ];
}

function solutionFrames(path: string, scene: SceneId = "solution", practice = false): Frame[] {
  const tokens = partsOf(path);
  const frames: Frame[] = [];
  const pile: string[] = [];
  let asked = false;
  let showedTrap = false;
  let fullest = 0;
  const line = (index: number) => (practice ? undefined : index);
  const rawParts = path.split("/");
  const shown = rawParts.filter((part) => part.length > 0);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new path: ${path}. You decide what ".." does to the pile.`
      : "The pile starts empty. The root floor is already there and cannot leave.",
    codeLine: line(0),
    state: blank(tokens),
  });

  for (let i = 0; i < shown.length; i++) {
    const part = shown[i];
    if (part === ".") {
      frames.push({
        scene,
        caption: `"." means stay in this folder. Skip it. No plate is set down.`,
        codeLine: line(2),
        state: base(tokens, pile, i, { held: ".", heldTone: "faded" }),
      });
      continue;
    }
    if (part !== "..") {
      pile.push(part);
      fullest = Math.max(fullest, pile.length);
      frames.push({
        scene,
        caption: `${part} is a folder. Set it down as a plate on the pile.`,
        codeLine: line(6),
        state: { ...base(tokens, pile, i), plates: platesOf(pile, "edge") },
      });
      continue;
    }

    const ask = practice || !asked;
    const before = base(tokens, pile, i, { held: "..", askNone: true, noneLabel: "stay at root" });
    const clash: Frame = {
      scene,
      caption: ask ? `".." arrived. The pile has ${pile.length} folder plate${pile.length === 1 ? "" : "s"}.` : `".." looks at the top folder plate.`,
      codeLine: line(3),
      state: before,
    };
    if (ask) {
      asked = true;
      clash.quiz = upQuiz(before, pile);
    }
    frames.push(clash);

    if (pile.length === 0) {
      if (!showedTrap && !practice) {
        showedTrap = true;
        frames.push({
          scene,
          caption: `The Root Trap. The pile is empty, so going up would leave the root. We leave the floor where it is.`,
          codeLine: line(4),
          state: { ...base(tokens, pile, i, { held: "..", heldTone: "miss", xMark: true, floorTone: "miss" }) },
        });
      }
      frames.push({
        scene,
        caption: `The pile is empty, so ".." does nothing. The path stays at the root floor.`,
        codeLine: line(4),
        state: base(tokens, pile, i, { floorTone: "done" }),
      });
      continue;
    }

    const gone = pile.pop()!;
    frames.push({
      scene,
      caption: `".." takes the top folder plate ${gone} off the pile.`,
      codeLine: line(4),
      state: { ...base(tokens, pile, i), plates: platesOf(pile, pile.length ? "edge" : undefined) },
    });
  }

  const out = pile.length === 0 ? "/" : `/${pile.join("/")}`;
  frames.push({
    scene,
    caption: practice ? `Join the plates from the floor up. The answer is ${out}.` : `Join the remaining folder plates with a leading slash. The answer is ${out}.`,
    codeLine: line(12),
    state: { ...base(tokens, pile, null, { result: out }), plates: platesOf(pile, "done") },
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Each part is skipped, set down, or taken at most once, then joined once.`,
      codeLine: 1,
      state: { ...blank(tokens), result: out, counter: { label: "parts read", value: shown.length } },
    });
    frames.push({
      scene,
      caption: `Space: O(n). The pile holds the folders that remain. Here it held ${fullest} plate${fullest === 1 ? "" : "s"} at its fullest.`,
      codeLine: 0,
      state: { ...blank(tokens), result: out, pileLit: true, plates: platesOf(Array.from({ length: Math.max(fullest, 0) }, (_, index) => `f${index}`), "window"), counter: { label: "plates at fullest", value: fullest } },
    });
  }
  return frames;
}

export const simplifyPathStory: ProblemStory<PlateStackState> = {
  slugs: ["lc-71"],
  pattern: "Stack",
  trigger: "a Unix path with slashes, '.', and '..', and you must return the simplified absolute path",
  insight: "Folder plates on a root floor. A real name is a plate. \"..\" takes the top plate if there is one. The floor never leaves.",
  metaphor: {
    name: "The plate pile",
    legend: "pile = remaining folders · top plate = last folder entered · root floor = / · take = pop on ..",
    terms: ["plate", "pile", "root"],
  },
  traps: [
    {
      name: "The Root Trap",
      rule: "If the pile is empty, \"..\" does nothing. Never go above the root floor.",
    },
  ],
  template: [
    "pile of folder names, on a root floor;",
    "for each part {",
    "    skip empty and \".\";",
    "    if \"..\": take the top plate, or stay if empty;",
    "    else set the name down;",
    "}",
    "join with a leading / ; empty pile is /;",
  ],
  complexity: {
    slow: "O(n²)",
    time: "O(n)",
    timeWhy: "each part is set down or taken at most once, then joined once",
    space: "O(n)",
    spaceWhy: "the pile holds the folders that remain",
  },
  code: CODE,
  examples: [
    { label: '"/home/"', input: '"/home/"', expected: "/home" },
    { label: '"/../"', input: '"/../"', expected: "/", note: "'..' at root does nothing" },
    { label: '"/a/./b/../../c/"', input: '"/a/./b/../../c/"', expected: "/c" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-151", title: "Reverse Words in a String" },
    { slug: "lc-394", title: "Decode String" },
    { slug: "lc-20", title: "Valid Parentheses" },
  ],
  answer: (input) => solve(parse(input)),
  frames: (input) => {
    const path = parse(input);
    const tokens = partsOf(path);
    const out = solve(path);
    return [
      ...pictureFrames(path),
      ...slowFrames(path),
      ...insightFrames(path),
      ...solutionFrames(path),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(tokens), result: out, plates: platesOf(out === "/" ? [] : out.slice(1).split("/"), "done") },
      },
    ];
  },
  View: GrokPlateStackView,
};
