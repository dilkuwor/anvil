import { PriceTagsView, type PriceTagsState } from "../rec07-price-tags-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<PriceTagsState>;
type Point = [number, number];

/** Fresh map for the "your turn" run. After the second house joins, the cheapest tag still comes from the first house. */
const PRACTICE = "[[0,0],[4,0],[0,5],[8,2]]";

const CODE = [
  "int n = points.length;",
  "int[] price = new int[n];",
  "Arrays.fill(price, Integer.MAX_VALUE);",
  "boolean[] inNetwork = new boolean[n];",
  "price[0] = 0;",
  "int total = 0;",
  "for (int round = 0; round < n; round++) {",
  "    int next = -1;",
  "    for (int i = 0; i < n; i++)",
  "        if (!inNetwork[i] && (next == -1 || price[i] < price[next])) next = i;",
  "    inNetwork[next] = true;",
  "    total += price[next];",
  "    for (int i = 0; i < n; i++) {",
  "        if (inNetwork[i]) continue;",
  "        int cable = Math.abs(points[i][0] - points[next][0]) + Math.abs(points[i][1] - points[next][1]);",
  "        price[i] = Math.min(price[i], cable);",
  "    }",
  "}",
  "return total;",
];

function parse(input: string): Point[] {
  return JSON.parse(input.trim()) as Point[];
}

const cost = (a: Point, b: Point) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const name = (p: Point) => `(${p[0]},${p[1]})`;

function blank(points: Point[]): PriceTagsState {
  return { points, inNet: points.map(() => false), price: points.map(() => null), tags: false, from: points.map(() => null), cables: [], newest: null, total: null };
}

/** Independent check: Kruskal, sort every pair and join separate groups. */
function kruskal(points: Point[]): { total: number; cables: [number, number][] } {
  const n = points.length;
  const pairs: [number, number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([cost(points[a], points[b]), a, b]);
  pairs.sort((x, y) => x[0] - y[0]);
  const parent = points.map((_, index) => index);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  let total = 0;
  const cables: [number, number][] = [];
  for (const [c, a, b] of pairs) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) continue;
    parent[ra] = rb;
    total += c;
    cables.push([a, b]);
  }
  return { total, cables };
}

function pictureFrames(points: Point[]): Frame[] {
  const base = blank(points);
  const frames: Frame[] = [
    { scene: "picture", caption: "Each dot is a house on a map. We want cables so that every house can reach every other house.", state: base },
  ];
  if (points.length > 1) {
    const c = cost(points[0], points[1]);
    frames.push({
      scene: "picture",
      caption: `A cable costs the steps across plus the steps up or down. From ${name(points[0])} to ${name(points[1])} that is ${c}.`,
      state: { ...base, probe: { from: 0, to: 1, cost: c, tone: "accent" } },
    });
  }
  frames.push({
    scene: "picture",
    caption: "Allowed: a house may reach another through other houses. So a loop of cables is never needed.",
    state: base,
  });
  const best = kruskal(points);
  frames.push({
    scene: "picture",
    caption: "The goal: the cheapest set of cables that links every house. Return its total cost.",
    state: { ...base, cables: best.cables, inNet: points.map(() => true) },
  });
  return frames;
}

function slowFrames(points: Point[]): Frame[] {
  const n = points.length;
  const inNet = points.map((_, index) => index === 0);
  const cables: [number, number][] = [];
  const frames: Frame[] = [];
  let measured = 0;
  let total = 0;
  for (let round = 1; round < n; round++) {
    let best = Infinity;
    let pair: [number, number] = [0, 0];
    let thisRound = 0;
    for (let a = 0; a < n; a++) {
      if (!inNet[a]) continue;
      for (let b = 0; b < n; b++) {
        if (inNet[b]) continue;
        thisRound++;
        const c = cost(points[a], points[b]);
        if (c < best) {
          best = c;
          pair = [a, b];
        }
      }
    }
    measured += thisRound;
    inNet[pair[1]] = true;
    cables.push(pair);
    total += best;
    frames.push({
      scene: "slow",
      caption:
        round === 1
          ? `The slow way: each round, measure every cable from a network house to an outside house. The cheapest joins ${name(points[pair[1]])}.`
          : `Round ${round}: measure all ${thisRound} network-to-outside cables again. The cheapest, ${best}, joins ${name(points[pair[1]])}.`,
      state: { ...blank(points), inNet: [...inNet], cables: [...cables], newest: pair[1], total, counter: { label: "cables measured", value: measured } },
    });
  }
  frames.push({
    scene: "slow",
    caption: `Total ${total}, after measuring ${measured} cables. Each round measures again cables it already knew. This is O(n³) time.`,
    state: { ...blank(points), inNet: points.map(() => true), cables, total, counter: { label: "cables measured", value: measured } },
  });
  return frames;
}

type Round = { newest: number; paid: number; before: (number | null)[]; beforeFrom: (number | null)[]; checks: { house: number; cable: number; old: number | null; oldFrom: number | null }[] };

/** The real Prim's algorithm, recorded round by round. */
function prim(points: Point[]): { total: number; rounds: Round[] } {
  const n = points.length;
  const price: (number | null)[] = points.map((_, index) => (index === 0 ? 0 : null));
  const from: (number | null)[] = points.map(() => null);
  const inNet = points.map(() => false);
  const rounds: Round[] = [];
  let total = 0;
  for (let round = 0; round < n; round++) {
    let next = -1;
    for (let i = 0; i < n; i++) {
      if (inNet[i] || price[i] === null) continue;
      if (next === -1 || price[i]! < price[next]!) next = i;
    }
    const record: Round = { newest: next, paid: price[next]!, before: [...price], beforeFrom: [...from], checks: [] };
    inNet[next] = true;
    total += price[next]!;
    for (let i = 0; i < n; i++) {
      if (inNet[i]) continue;
      const cable = cost(points[i], points[next]);
      record.checks.push({ house: i, cable, old: price[i], oldFrom: from[i] });
      if (price[i] === null || cable < price[i]!) {
        price[i] = cable;
        from[i] = next;
      }
    }
    rounds.push(record);
  }
  return { total, rounds };
}

function insightFrames(points: Point[]): Frame[] {
  const { rounds } = prim(points);
  const frames: Frame[] = [];
  if (rounds.length < 2) return frames;
  const first = rounds[0];
  const tags = first.checks.map((check) => check.cable);
  const afterFirst = points.map((_, index) => (index === 0 ? 0 : tags[index - 1] ?? null));
  frames.push({
    scene: "insight",
    caption: `Picture a price tag on every outside house: its cheapest cable into the network. Right now the network is only ${name(points[0])}.`,
    state: { ...blank(points), inNet: points.map((_, index) => index === 0), tags: true, price: afterFirst, from: points.map((_, index) => (index === 0 ? null : 0)), newest: 0, total: 0 },
  });
  frames.push({
    scene: "insight",
    caption: "The cheapest tag joins next. After that, only cables from the new house are new, so each tag needs just one check.",
    state: { ...blank(points), inNet: points.map((_, index) => index === 0), tags: true, price: afterFirst, from: points.map((_, index) => (index === 0 ? null : 0)), newest: 0, total: 0 },
  });
  // The first time a tag is kept because an older house is closer than the newest one.
  for (let r = 1; r < rounds.length; r++) {
    const kept = rounds[r].checks.find((check) => check.old !== null && check.cable > check.old && check.oldFrom !== rounds[r].newest);
    if (!kept) continue;
    const inNet = points.map((_, index) => rounds.slice(0, r + 1).some((round) => round.newest === index));
    const cables = rounds.slice(1, r + 1).map((round) => [round.beforeFrom[round.newest]!, round.newest] as [number, number]);
    frames.push({
      scene: "insight",
      caption: `The tag on ${name(points[kept.house])} stays ${kept.old}. Its cheapest cable comes from ${name(points[kept.oldFrom!])}, an older house, not from the newest one.`,
      state: {
        ...blank(points),
        inNet,
        cables,
        tags: true,
        price: points.map((_, index) => (index === kept.house ? kept.old : null)),
        from: points.map((_, index) => (index === kept.house ? kept.oldFrom : null)),
        newest: rounds[r].newest,
        probe: { from: rounds[r].newest, to: kept.house, cost: kept.cable, tone: "coral" },
      },
    });
    break;
  }
  return frames;
}

function pickQuiz(points: Point[], price: (number | null)[], inNet: boolean[], answer: number): StoryQuiz | null {
  const open = points.map((_, index) => index).filter((index) => !inNet[index] && price[index] !== null);
  const best = price[answer];
  if (open.filter((index) => price[index] === best).length > 1) return null;
  const feedback: Record<number, string> = {};
  points.forEach((point, index) => {
    if (index === answer) return;
    if (inNet[index]) feedback[index] = `${name(point)} is already in the network.`;
    else if (price[index] !== null) feedback[index] = `The tag on ${name(point)} says ${price[index]}. Another tag is cheaper.`;
  });
  return {
    kind: "cell",
    cells: points.length,
    question: "Which house joins the network next? Click it.",
    answer,
    feedback,
    otherwise: "Read the price tags. The house with the cheapest tag joins.",
    why: `The cheapest tag, ${best}. No other outside house can be joined for less.`,
  };
}

function tagQuiz(points: Point[], house: number, cable: number, old: number, oldFrom: number, newest: number): StoryQuiz {
  const lower = cable < old;
  return {
    kind: "choice",
    question: `The cable from the new house ${name(points[newest])} to ${name(points[house])} costs ${cable}. Its tag says ${old}. What happens to the tag?`,
    options: [`It becomes ${cable}, the cable from the new house`, `It stays ${old}, the cable from ${name(points[oldFrom])}`],
    answer: lower ? 0 : 1,
    why: lower ? `${cable} is cheaper, so the tag drops.` : `${old} is still cheaper. A tag only ever goes down, whichever house it comes from.`,
  };
}

/** The real algorithm, one frame per change. `practice` asks at every decision and shows no code. */
function solutionFrames(points: Point[], scene: SceneId = "solution", practice = false): Frame[] {
  const n = points.length;
  const line = (index: number) => (practice ? undefined : index);
  const price: (number | null)[] = points.map((_, index) => (index === 0 ? 0 : null));
  const from: (number | null)[] = points.map(() => null);
  const inNet = points.map(() => false);
  const cables: [number, number][] = [];
  const frames: Frame[] = [];
  const asked = { pick: false, keep: false, drop: false };
  let total = 0;
  let measured = 0;
  let newest: number | null = null;
  const at = (extra: Partial<PriceTagsState> = {}): PriceTagsState => ({
    ...blank(points),
    inNet: [...inNet],
    price: [...price],
    from: [...from],
    tags: true,
    cables: [...cables],
    newest,
    total,
    ...extra,
  });

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new map with ${n} houses. You pick each house and each tag.`
      : `Every house wears a price tag of infinity, except ${name(points[0])}. Its tag is 0: the network starts there.`,
    codeLine: line(4),
    state: at(),
  });

  for (let round = 0; round < n; round++) {
    let next = -1;
    for (let i = 0; i < n; i++) {
      if (inNet[i] || price[i] === null) continue;
      if (next === -1 || price[i]! < price[next]!) next = i;
    }
    if (round > 0 && (practice || !asked.pick)) {
      const quiz = pickQuiz(points, price, inNet, next);
      if (quiz) {
        asked.pick = true;
        frames.push({ scene, caption: "Every outside house shows its tag. One of them joins the network now.", codeLine: line(9), state: at({ newest: null }), quiz });
      }
    }
    inNet[next] = true;
    total += price[next]!;
    if (from[next] !== null) cables.push([from[next]!, next]);
    newest = next;
    frames.push({
      scene,
      caption:
        round === 0
          ? `${name(points[next])} joins the network for 0. It is the first house.`
          : `${name(points[next])} has the cheapest tag, ${price[next]}. It joins the network with that cable. The network costs ${total} so far.`,
      codeLine: line(11),
      state: at(),
    });
    if (round === n - 1) break;

    const outside = points.map((_, index) => index).filter((index) => !inNet[index]);
    if (round === 0) {
      for (const house of outside) {
        price[house] = cost(points[house], points[next]);
        from[house] = next;
        measured++;
      }
      frames.push({
        scene,
        caption: `Measure a cable from ${name(points[next])} to each outside house. Every tag drops from infinity to that cable's cost.`,
        codeLine: line(15),
        state: at(),
      });
      continue;
    }
    for (const house of outside) {
      const cable = cost(points[house], points[next]);
      measured++;
      const old = price[house]!;
      const oldFrom = from[house]!;
      const lower = cable < old;
      const kind = lower ? "drop" : cable > old ? "keep" : "tie";
      if (practice || (kind !== "tie" && !asked[kind])) {
        if (kind !== "tie") asked[kind] = true;
        frames.push({
          scene,
          caption: `Measure the cable from the new house ${name(points[next])} to ${name(points[house])}.`,
          codeLine: line(14),
          state: at({ probe: { from: next, to: house, cost: cable, tone: "accent" } }),
          quiz: tagQuiz(points, house, cable, old, oldFrom, next),
        });
      }
      if (lower) {
        price[house] = cable;
        from[house] = next;
        frames.push({
          scene,
          caption: `The cable costs ${cable}, cheaper than the tag ${old}. The tag on ${name(points[house])} drops to ${cable}.`,
          codeLine: line(15),
          state: at({ probe: { from: next, to: house, cost: cable, tone: "teal" }, lowered: house }),
        });
      } else {
        frames.push({
          scene,
          caption:
            oldFrom !== next && cable > old
              ? `The Newest House Trap: the new house's cable would cost ${cable}. The tag keeps ${old}, from ${name(points[oldFrom])}, an older house.`
              : `The cable costs ${cable}, not cheaper than the tag ${old}. The tag on ${name(points[house])} stays ${old}.`,
          codeLine: line(15),
          state: at({ trap: { from: next, to: house, cost: cable } }),
        });
      }
    }
  }

  newest = null;
  frames.push({
    scene,
    caption: practice ? `Every house is in the network. The total is ${total}. You kept every tag at its cheapest.` : `Every house is in the network. The answer is ${total}.`,
    codeLine: line(18),
    state: at(),
  });
  if (!practice) {
    const slow = (() => {
      let count = 0;
      for (let k = 1; k < n; k++) count += k * (n - k);
      return count;
    })();
    frames.push({
      scene,
      caption: `Time: O(n²). Each round measures one cable per outside house and reads every tag once: ${measured} cables here, against ${slow} the slow way.`,
      codeLine: 6,
      state: at({ counter: { label: "cables measured", value: measured } }),
    });
    frames.push({
      scene,
      caption: "Space: O(n). One price tag and one in-the-network mark per house.",
      codeLine: 1,
      state: at(),
    });
  }
  return frames;
}

export const minCostConnectPointsStory: ProblemStory<PriceTagsState> = {
  slugs: ["lc-1584"],
  pattern: "Minimum spanning tree (Prim)",
  trigger: "connect all points with the smallest total cost, where any two points can be joined",
  insight: "Grow one cable network house by house. Every outside house wears a price tag: its cheapest cable to any house already in. Connect the cheapest tag, then lower tags using only the new house.",
  metaphor: {
    name: "The price tags",
    legend: "house = point · tag = price[i] · in the network = inNetwork[i] · new house = next · network cost = total",
    terms: ["house", "tag", "cable", "network"],
  },
  traps: [{ name: "The Newest House Trap", rule: "The next cable may start at any house already in the network, not only the newest one. A price tag only ever goes down." }],
  template: [
    "price[start] = 0; every other price = infinity;",
    "repeat n times {",
    "    take the outside node with the smallest price; add its price;",
    "    for each outside node: price = min(price, edge from the new node);",
    "}",
  ],
  complexity: {
    slow: "O(n³)",
    time: "O(n²)",
    timeWhy: "n rounds, and each round reads every tag and measures one cable per outside house",
    space: "O(n)",
    spaceWhy: "one price tag and one in-the-network mark per house",
  },
  code: CODE,
  examples: [
    { label: "5 houses", input: "[[0,0],[2,2],[3,10],[5,2],[7,0]]", expected: "20", note: "The far house keeps a tag from an older house" },
    { label: "3 houses", input: "[[3,12],[-2,5],[-4,1]]", expected: "18" },
    { label: "4 houses in a square", input: "[[0,0],[1,1],[1,0],[-1,1]]", expected: "4" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-684", title: "Redundant Connection" },
    { slug: "lc-743", title: "Network Delay Time" },
    { slug: "lc-547", title: "Number of Provinces" },
  ],
  answer: (input) => String(kruskal(parse(input)).total),
  frames: (input) => {
    const points = parse(input);
    const best = kruskal(points);
    return [
      ...pictureFrames(points),
      ...slowFrames(points),
      ...insightFrames(points),
      ...solutionFrames(points),
      ...solutionFrames(parse(PRACTICE), "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: { ...blank(points), inNet: points.map(() => true), cables: best.cables, total: best.total },
      },
    ];
  },
  View: PriceTagsView,
};
