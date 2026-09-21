import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE =
  "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 0";
const TRAP = "The Chained Flights Trap";

const CODE = [
  "public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {",
  "    int[] prices = new int[n];",
  "    Arrays.fill(prices, Integer.MAX_VALUE);",
  "    prices[src] = 0;",
  "    for (int i = 0; i <= k; i++) {",
  "        int[] temp = Arrays.copyOf(prices, n);",
  "        for (int[] flight : flights) {",
  "            int u = flight[0], v = flight[1], w = flight[2];",
  "            if (prices[u] != Integer.MAX_VALUE && prices[u] + w < temp[v]) {",
  "                temp[v] = prices[u] + w;",
  "            }",
  "        }",
  "        prices = temp;",
  "    }",
  "    return prices[dst] == Integer.MAX_VALUE ? -1 : prices[dst];",
  "}",
];

type FlightsInput = {
  n: number;
  flights: [number, number, number][];
  src: number;
  dst: number;
  k: number;
};

function parseFlightsInput(input: string): FlightsInput {
  try {
    const nMatch = input.match(/n\s*=\s*(\d+)/);
    const flightsMatch = input.match(/flights\s*=\s*(\[\[.*?\]\])/);
    const srcMatch = input.match(/src\s*=\s*(\d+)/);
    const dstMatch = input.match(/dst\s*=\s*(\d+)/);
    const kMatch = input.match(/k\s*=\s*(\d+)/);
    if (nMatch && flightsMatch && srcMatch && dstMatch && kMatch) {
      return {
        n: Number(nMatch[1]),
        flights: JSON.parse(flightsMatch[1]),
        src: Number(srcMatch[1]),
        dst: Number(dstMatch[1]),
        k: Number(kMatch[1]),
      };
    }
  } catch {
    // fallback
  }
  return {
    n: 3,
    flights: [
      [0, 1, 100],
      [1, 2, 100],
      [0, 2, 500],
    ],
    src: 0,
    dst: 2,
    k: 1,
  };
}

function solveCheapestFlights(data: FlightsInput): number {
  const { n, flights, src, dst, k } = data;
  let prices = new Array(n).fill(Infinity);
  prices[src] = 0;
  for (let i = 0; i <= k; i++) {
    const temp = [...prices];
    for (const [u, v, w] of flights) {
      if (prices[u] !== Infinity && prices[u] + w < temp[v]) {
        temp[v] = prices[u] + w;
      }
    }
    prices = temp;
  }
  return prices[dst] === Infinity ? -1 : prices[dst];
}

function answerText(input: string): string {
  const data = parseFlightsInput(input);
  return String(solveCheapestFlights(data));
}

function buildSlots(
  n: number,
  prices: number[],
  src: number,
  dst: number,
  activeCity?: number
): DesignSlot[] {
  const slots: DesignSlot[] = [];
  for (let i = 0; i < n; i++) {
    const p = prices[i];
    const isFinite = p !== Infinity;
    const isActive = activeCity === i;
    const role = i === src ? "origin" : i === dst ? "destination" : "layover";
    slots.push({
      id: i,
      key: `Airport ${i}`,
      val: isFinite ? `$${p}` : "∞",
      sub: role,
      tone: isActive ? "edge" : isFinite ? "hit" : "idle",
    });
  }
  return slots;
}

function buildBuckets(
  snapshot: number[],
  flights: [number, number, number][]
): DesignBucket[] {
  const snapshotItems = snapshot
    .map((p, idx) => ({ idx, p }))
    .filter((item) => item.p !== Infinity)
    .map((item) => ({
      text: `Airport ${item.idx}: $${item.p}`,
      tone: "edge" as const,
    }));

  return [
    {
      id: "snapshot",
      label: "Round Voucher Snapshot",
      items:
        snapshotItems.length > 0
          ? snapshotItems
          : [{ text: "no prices settled", tone: "idle" as const }],
      tone: "edge",
    },
    {
      id: "routes",
      label: "Flight Routes",
      items: flights.slice(0, 4).map(([u, v, w]) => ({
        text: `${u} ➔ ${v} ($${w})`,
        tone: "idle" as const,
      })),
      tone: "idle",
    },
  ];
}

function pictureFrames(): Frame[] {
  const scene: SceneId = "picture";
  const dummyPrices = [0, Infinity, Infinity];
  const dummyFlights: [number, number, number][] = [
    [0, 1, 100],
    [1, 2, 100],
    [0, 2, 500],
  ];

  return [
    {
      scene,
      caption: "A traveler books flight routes between airports with ticket prices and layover limits.",
      state: {
        slots: buildSlots(3, dummyPrices, 0, 2),
        buckets: buildBuckets([0], dummyFlights),
        counter: { label: "layovers allowed", value: "k = 1" },
        status: { text: "origin airport 0 ready", tone: "accent" },
        note: { text: "find cheapest path with at most k stops", tone: "accent" },
      },
    },
    {
      scene,
      caption: "We seek the cheapest flight price from origin to destination using at most k stops.",
      state: {
        slots: buildSlots(3, dummyPrices, 0, 2, 0),
        buckets: buildBuckets([0], dummyFlights),
        counter: { label: "origin to destination", value: "0 ➔ 2" },
        status: { text: "at most 1 stop allowed", tone: "teal" },
        note: { text: "each stop is an intermediate airport", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const scene: SceneId = "slow";
  const dummyPrices = [0, 100, 200];
  const dummyFlights: [number, number, number][] = [
    [0, 1, 100],
    [1, 2, 100],
    [0, 2, 500],
  ];

  return [
    {
      scene,
      caption: "A slow approach explores all routes blindly without tracking how many stops were made.",
      state: {
        slots: buildSlots(3, dummyPrices, 0, 2),
        buckets: buildBuckets([0, 100], dummyFlights),
        counter: { label: "tracking", value: "unbounded" },
        status: { text: "unbounded searches violate layover caps", tone: "coral" },
        note: { text: "exceeding stops gives invalid prices", tone: "coral" },
      },
    },
    {
      scene,
      caption: "Without round separation, one round can take multiple flights and violate the stop limit.",
      state: {
        slots: buildSlots(3, dummyPrices, 0, 2),
        buckets: buildBuckets([0, 100, 200], dummyFlights),
        counter: { label: "risk", value: "too many stops" },
        status: { text: "chaining flights breaks the k rule", tone: "coral" },
        note: { text: "we must bound each hop round", tone: "coral" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const scene: SceneId = "insight";
  const dummyPrices = [0, Infinity, Infinity];
  const dummyFlights: [number, number, number][] = [
    [0, 1, 100],
    [1, 2, 100],
    [0, 2, 500],
  ];

  return [
    {
      scene,
      caption: "Insight: relaxing flight edges in rounds models taking one more flight hop each round.",
      state: {
        slots: buildSlots(3, dummyPrices, 0, 2, 0),
        buckets: buildBuckets([0], dummyFlights),
        counter: { label: "round bounds", value: "k + 1 rounds" },
        status: { text: "k stops means at most k + 1 flights", tone: "accent" },
        note: { text: "each round adds at most one leg", tone: "accent" },
      },
    },
    {
      scene,
      caption: "Clone the price array into a voucher snapshot before each round to freeze available flights.",
      state: {
        slots: buildSlots(3, dummyPrices, 0, 2),
        buckets: buildBuckets([0], dummyFlights),
        counter: { label: "snapshot ledger", value: "frozen prices" },
        status: { text: "read only from the previous round snapshot", tone: "teal" },
        note: { text: "stops chained flights in a single round", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(data: FlightsInput): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const { n, flights, src, dst, k } = data;

  let prices = new Array(n).fill(Infinity);
  prices[src] = 0;

  frames.push({
    scene,
    codeLine: 3,
    caption: `Set origin airport ${src} to price $0 and fill all other airport prices with infinity.`,
    state: {
      slots: buildSlots(n, prices, src, dst, src),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "round", value: "0 of " + (k + 1) },
      status: { text: `origin airport ${src} ticket costs $0`, tone: "accent" },
      note: { text: "prepare baseline price ledger", tone: "accent" },
    },
  });

  // Round 0: 1st flight hop
  let temp = [...prices];
  frames.push({
    scene,
    codeLine: 5,
    caption: `Round 1 of ${k + 1}: snapshot the voucher ledger so we only extend routes from previous stops.`,
    state: {
      slots: buildSlots(n, prices, src, dst),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "round", value: `1 of ${k + 1}` },
      status: { text: "snapshot taken for round 1", tone: "teal" },
      note: { text: "first flight hop round", tone: "teal" },
    },
  });

  // Relax flights in round 0
  for (const [u, v, w] of flights) {
    if (prices[u] !== Infinity && prices[u] + w < temp[v]) {
      temp[v] = prices[u] + w;
    }
  }

  frames.push({
    scene,
    codeLine: 9,
    caption: "Direct flight 0 to 1 costs $100 and direct flight 0 to 2 costs $500 in this first hop.",
    state: {
      slots: buildSlots(n, temp, src, dst, 1),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "round", value: `1 of ${k + 1}` },
      status: { text: "routes updated from origin", tone: "accent" },
      note: { text: "direct flight connections relaxed", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 12,
    caption: "We read prices from the snapshot copy to avoid the chained flights trap.",
    state: {
      slots: buildSlots(n, temp, src, dst),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "trap avoidance", value: "freeze snapshot" },
      status: { text: "snapshot keeps flight count honest", tone: "teal" },
      note: { text: "prevents chaining two flights in one round", tone: "teal" },
    },
  });

  prices = [...temp];

  // Round 1 (if k >= 1)
  if (k >= 1) {
    temp = [...prices];

    frames.push({
      scene,
      codeLine: 5,
      caption: `Round 2 of ${k + 1}: take a new voucher snapshot to check layover routes with 1 stop.`,
      state: {
        slots: buildSlots(n, prices, src, dst),
        buckets: buildBuckets([...prices], flights),
        counter: { label: "round", value: `2 of ${k + 1}` },
        status: { text: "snapshot updated for round 2", tone: "teal" },
        note: { text: "second flight hop allows 1 layover", tone: "teal" },
      },
    });

    for (const [u, v, w] of flights) {
      if (prices[u] !== Infinity && prices[u] + w < temp[v]) {
        temp[v] = prices[u] + w;
      }
    }

    frames.push({
      scene,
      codeLine: 9,
      caption: "Connecting flight 1 to 2 costs $100 plus $100 = $200, cheaper than the direct $500 route.",
      state: {
        slots: buildSlots(n, temp, src, dst, 2),
        buckets: buildBuckets([...prices], flights),
        counter: { label: "round", value: `2 of ${k + 1}` },
        status: { text: "cheaper route found: $200", tone: "accent" },
        note: { text: "layover saves $300 total price", tone: "accent" },
      },
    });

    prices = [...temp];
  }

  const finalCost = prices[dst] === Infinity ? -1 : prices[dst];

  frames.push({
    scene,
    codeLine: 14,
    caption: `All rounds finish and destination city ${dst} has minimum price ${finalCost}, so the final answer is ${finalCost}.`,
    state: {
      slots: buildSlots(n, prices, src, dst),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "best price", value: `$${finalCost}` },
      status: { text: `final cheapest price is ${finalCost}`, tone: "teal" },
      note: { text: "layover limit respected", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Time: O(K × E). We relax all flight edges across at most K plus 1 rounds using snapshot arrays.",
    state: {
      slots: buildSlots(n, prices, src, dst),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "time complexity", value: "O(K × E)" },
      status: { text: "k plus 1 rounds across all flights", tone: "teal" },
      note: { text: "efficient bounded relaxation", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Space: O(V). Two price arrays of size V hold current prices and the previous round snapshot.",
    state: {
      slots: buildSlots(n, prices, src, dst),
      buckets: buildBuckets([...prices], flights),
      counter: { label: "space complexity", value: "O(V)" },
      status: { text: "linear space for airport prices", tone: "teal" },
      note: { text: "compact storage per city", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const dummyPrices = [0, 100, 200];
  const dummyFlights: [number, number, number][] = [
    [0, 1, 100],
    [1, 2, 100],
    [0, 2, 500],
  ];

  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "Why do we run at most k + 1 rounds of flight relaxation?",
    options: [
      "At most k stops means at most k + 1 flight legs can be taken.",
      "Each round doubles the number of airports reached.",
      "There are always k + 1 cities in the graph.",
    ],
    answer: 0,
    why: "Each round corresponds to taking at most one additional flight leg.",
  };

  frames.push({
    scene,
    caption: "Let us review key rules for finding cheapest flights with limited stops.",
    state: {
      slots: buildSlots(3, dummyPrices, 0, 2),
      buckets: buildBuckets(dummyPrices, dummyFlights),
      counter: { label: "review", value: "round count" },
      status: { text: "how many rounds to run?", tone: "accent" },
      note: { text: "k stops equals k + 1 flight hops", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Correct. A route with k layovers contains at most k + 1 flight hops.",
    state: {
      slots: buildSlots(3, dummyPrices, 0, 2),
      buckets: buildBuckets(dummyPrices, dummyFlights),
      counter: { label: "review", value: "k + 1 rounds" },
      status: { text: "k + 1 rounds verified", tone: "teal" },
      note: { text: "each round allows one more flight leg", tone: "teal" },
    },
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "What happens if we do not clone prices into a snapshot each round?",
    options: [
      "Flights can chain in a single round and exceed the allowed stop limit.",
      "Airport prices would become negative.",
      "The program would run into an infinite loop.",
    ],
    answer: 0,
    why: "Updating prices in place lets later flights in the same round reuse newly found prices.",
  };

  frames.push({
    scene,
    caption: "Consider why we snapshot prices instead of modifying the same array.",
    state: {
      slots: buildSlots(3, dummyPrices, 0, 2),
      buckets: buildBuckets(dummyPrices, dummyFlights),
      counter: { label: "review", value: "snapshot safety" },
      status: { text: "preventing chained flights", tone: "accent" },
      note: { text: "snapshot keeps stops bounded", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Correct. The snapshot prevents using a newly unlocked flight in the very same round.",
    state: {
      slots: buildSlots(3, dummyPrices, 0, 2),
      buckets: buildBuckets(dummyPrices, dummyFlights),
      counter: { label: "review", value: "chaining prevented" },
      status: { text: "voucher snapshot guarantees stop bounds", tone: "teal" },
      note: { text: "safeguard against chained flights", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Remember the sky layover voucher routes: relax k plus 1 rounds using snapshot arrays to bound stops.",
    state: {
      slots: buildSlots(3, dummyPrices, 0, 2),
      buckets: buildBuckets(dummyPrices, dummyFlights),
      counter: { label: "mastery", value: "complete" },
      status: { text: "cheapest flights mastered", tone: "teal" },
      note: { text: "bellman-ford bounded shortest path ready", tone: "teal" },
    },
  });

  return frames;
}

export const cheapestFlightsStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-787"],
  pattern: "Shortest path",
  trigger: "find cheapest flight route from source to destination with at most k stops",
  insight: "Use Bellman-Ford relaxed over k + 1 rounds. In each round, read prices from a voucher snapshot clone of the previous round to ensure each round adds at most one flight hop.",
  metaphor: {
    name: "The sky layover voucher routes",
    legend: "airport = city node · direct route = flight edge · voucher = price snapshot · layover limit = k stops · ledger = best price table",
    terms: ["flight", "airport", "layover", "voucher", "route", "stop", "ticket", "ledger", "price", "snapshot", "hop"],
  },
  traps: [{ name: TRAP, rule: "In each hop round, calculate candidate prices using a clone of the previous round. Using prices updated in the same round allows more stops than k." }],
  template: [
    "class Solution:",
    "    int findCheapestPrice(int n, int[][] flights, int src, int dst, int k): k+1 rounds Bellman-Ford using snapshot array",
  ],
  complexity: {
    slow: "O(V × E)",
    time: "O(K × E)",
    timeWhy: "we check all flight routes across at most K plus 1 rounds using snapshot arrays",
    space: "O(V)",
    spaceWhy: "two price arrays of size V hold current prices and the previous round snapshot",
  },
  code: CODE,
  examples: [
    {
      label: "3 airports with at most 1 stop allowed",
      input: "n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 1",
      expected: "200",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-743", title: "Network Delay Time" },
    { slug: "lc-127", title: "Word Ladder" },
    { slug: "lc-322", title: "Coin Change" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const data = parseFlightsInput(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(data),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
