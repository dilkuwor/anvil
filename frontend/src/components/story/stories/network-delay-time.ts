import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = "times = [[1,2,1]], n = 2, k = 1";
const TRAP = "The Stale Heap Entry Trap";

const CODE = [
  "public int networkDelayTime(int[][] times, int n, int k) {",
  "    Map<Integer, List<int[]>> adj = new HashMap<>();",
  "    for (int[] t : times) {",
  "        if (!adj.containsKey(t[0])) adj.put(t[0], new ArrayList<>());",
  "        adj.get(t[0]).add(new int[]{t[1], t[2]});",
  "    }",
  "    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> a[1] - b[1]);",
  "    heap.add(new int[]{k, 0});",
  "    Map<Integer, Integer> dist = new HashMap<>();",
  "    while (!heap.isEmpty()) {",
  "        int[] curr = heap.poll();",
  "        int u = curr[0], d = curr[1];",
  "        if (dist.containsKey(u)) continue;",
  "        dist.put(u, d);",
  "        for (int[] next : adj.getOrDefault(u, Collections.emptyList())) {",
  "            int v = next[0], weight = next[1];",
  "            if (!dist.containsKey(v)) heap.add(new int[]{v, d + weight});",
  "        }",
  "    }",
  "    if (dist.size() < n) return -1;",
  "    int maxTime = 0;",
  "    for (int d : dist.values()) maxTime = Math.max(maxTime, d);",
  "    return maxTime;",
  "}",
];

type NetworkInput = {
  times: [number, number, number][];
  n: number;
  k: number;
};

function parseNetworkInput(input: string): NetworkInput {
  try {
    const timesMatch = input.match(/times\s*=\s*(\[\[.*?\]\])/);
    const nMatch = input.match(/n\s*=\s*(\d+)/);
    const kMatch = input.match(/k\s*=\s*(\d+)/);
    if (timesMatch && nMatch && kMatch) {
      return {
        times: JSON.parse(timesMatch[1]),
        n: Number(nMatch[1]),
        k: Number(kMatch[1]),
      };
    }
  } catch {
    // fallback
  }
  return {
    times: [
      [2, 1, 1],
      [2, 3, 1],
      [3, 4, 1],
    ],
    n: 4,
    k: 2,
  };
}

function solveNetworkDelayTime(data: NetworkInput): number {
  const { times, n, k } = data;
  const adj = new Map<number, [number, number][]>();
  for (const [u, v, w] of times) {
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u)!.push([v, w]);
  }
  const dist = new Map<number, number>();
  const heap: [number, number][] = [[k, 0]];
  while (heap.length > 0) {
    heap.sort((a, b) => a[1] - b[1]);
    const [u, d] = heap.shift()!;
    if (dist.has(u)) continue;
    dist.set(u, d);
    for (const [v, w] of adj.get(u) ?? []) {
      if (!dist.has(v)) {
        heap.push([v, d + w]);
      }
    }
  }
  if (dist.size < n) return -1;
  let maxTime = 0;
  for (const d of dist.values()) {
    if (d > maxTime) maxTime = d;
  }
  return maxTime;
}

function answerText(input: string): string {
  const data = parseNetworkInput(input);
  return String(solveNetworkDelayTime(data));
}

function buildSlots(
  n: number,
  dist: Map<number, number>,
  activeBeacon?: number
): DesignSlot[] {
  const slots: DesignSlot[] = [];
  for (let i = 1; i <= n; i++) {
    const hasDist = dist.has(i);
    const d = dist.get(i);
    const isActive = activeBeacon === i;
    slots.push({
      id: i,
      key: `Beacon ${i}`,
      val: hasDist ? `${d} ms` : "unreached",
      sub: hasDist ? "settled" : "waiting",
      tone: isActive ? "edge" : hasDist ? "hit" : "idle",
    });
  }
  return slots;
}

function buildBuckets(
  heap: [number, number][],
  times: [number, number, number][]
): DesignBucket[] {
  return [
    {
      id: "heap",
      label: "Frontier Min-Heap",
      items:
        heap.length > 0
          ? heap.map(([node, time]) => ({
              text: `Beacon ${node} (${time} ms)`,
              tone: "edge" as const,
            }))
          : [{ text: "empty", tone: "idle" as const }],
      tone: "edge",
    },
    {
      id: "links",
      label: "Pulse Relay Routes",
      items: times.slice(0, 4).map(([u, v, w]) => ({
        text: `${u} ➔ ${v} (${w} ms)`,
        tone: "idle" as const,
      })),
      tone: "idle",
    },
  ];
}

function pictureFrames(): Frame[] {
  const scene: SceneId = "picture";
  const dummyDist = new Map<number, number>();
  const dummyTimes: [number, number, number][] = [
    [2, 1, 1],
    [2, 3, 1],
    [3, 4, 1],
  ];

  return [
    {
      scene,
      caption: "A network of radio beacons receives broadcast pulses through directional wires.",
      state: {
        slots: buildSlots(4, dummyDist),
        buckets: buildBuckets([], dummyTimes),
        counter: { label: "network size", value: "4 beacons" },
        status: { text: "signal ready to launch", tone: "accent" },
        note: { text: "every wire has a delay time", tone: "accent" },
      },
    },
    {
      scene,
      caption: "We want the minimum time for every beacon to catch the pulse from tower k.",
      state: {
        slots: buildSlots(4, dummyDist, 2),
        buckets: buildBuckets([[2, 0]], dummyTimes),
        counter: { label: "source tower", value: "Beacon 2" },
        status: { text: "source beacon sends first pulse", tone: "teal" },
        note: { text: "all beacons must be reached", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  const scene: SceneId = "slow";
  const dist = new Map<number, number>([[2, 0]]);
  const dummyTimes: [number, number, number][] = [
    [2, 1, 1],
    [2, 3, 1],
    [3, 4, 1],
  ];

  return [
    {
      scene,
      caption: "A slow search visits paths in any order, arriving late and updating again.",
      state: {
        slots: buildSlots(4, dist),
        buckets: buildBuckets([[1, 5], [3, 1]], dummyTimes),
        counter: { label: "order", value: "unordered" },
        status: { text: "longer routes overwrite earlier", tone: "coral" },
        note: { text: "unordered exploration does repeated work", tone: "coral" },
      },
    },
    {
      scene,
      caption: "Repeatedly updating distant beacons wastes time on slower detour paths.",
      state: {
        slots: buildSlots(4, dist),
        buckets: buildBuckets([[4, 6], [1, 5]], dummyTimes),
        counter: { label: "redundant steps", value: "high" },
        status: { text: "slow detour routes delay completion", tone: "coral" },
        note: { text: "we need an ordered frontier", tone: "coral" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  const scene: SceneId = "insight";
  const dist = new Map<number, number>([[2, 0]]);
  const dummyTimes: [number, number, number][] = [
    [2, 1, 1],
    [2, 3, 1],
    [3, 4, 1],
  ];

  return [
    {
      scene,
      caption: "Dijkstra insight: always expand the beacon with the smallest arrival time next.",
      state: {
        slots: buildSlots(4, dist, 2),
        buckets: buildBuckets([[1, 1], [3, 1]], dummyTimes),
        counter: { label: "rule", value: "earliest pulse next" },
        status: { text: "priority min-heap orders pulses", tone: "accent" },
        note: { text: "first arrival at a beacon is always optimal", tone: "teal" },
      },
    },
    {
      scene,
      caption: "Once a beacon is settled, its shortest delay is locked into our log book.",
      state: {
        slots: buildSlots(4, dist),
        buckets: buildBuckets([[1, 1]], dummyTimes),
        counter: { label: "log book", value: "lock shortest time" },
        status: { text: "settled beacons are never updated again", tone: "teal" },
        note: { text: "stale entries in the heap are ignored", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(data: NetworkInput): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const { times, n, k } = data;

  const adj = new Map<number, [number, number][]>();
  for (const [u, v, w] of times) {
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u)!.push([v, w]);
  }

  const dist = new Map<number, number>();
  const heap: [number, number][] = [[k, 0]];

  frames.push({
    scene,
    codeLine: 7,
    caption: `We place starting beacon ${k} with delay 0 ms into the priority min-heap.`,
    state: {
      slots: buildSlots(n, dist, k),
      buckets: buildBuckets([...heap], times),
      counter: { label: "settled", value: `0 of ${n}` },
      status: { text: `beacon ${k} entered heap at 0 ms`, tone: "accent" },
      note: { text: "frontier min-heap holds active pulses", tone: "accent" },
    },
  });

  heap.sort((a, b) => a[1] - b[1]);
  const [firstU, firstD] = heap.shift()!;
  dist.set(firstU, firstD);

  frames.push({
    scene,
    codeLine: 13,
    caption: `We poll beacon ${firstU} with delay ${firstD} ms and lock it into the log book.`,
    state: {
      slots: buildSlots(n, dist, firstU),
      buckets: buildBuckets([...heap], times),
      counter: { label: "settled", value: `1 of ${n}` },
      status: { text: `beacon ${firstU} settled at ${firstD} ms`, tone: "teal" },
      note: { text: "earliest pulse settled", tone: "teal" },
    },
  });

  for (const [v, w] of adj.get(firstU) ?? []) {
    heap.push([v, firstD + w]);
  }
  heap.sort((a, b) => a[1] - b[1]);

  frames.push({
    scene,
    codeLine: 16,
    caption: `Radio pulses spread from beacon ${firstU} along wires, adding targets to the min-heap.`,
    state: {
      slots: buildSlots(n, dist),
      buckets: buildBuckets([...heap], times),
      counter: { label: "settled", value: `1 of ${n}` },
      status: { text: "pulses spread to next towers", tone: "accent" },
      note: { text: "outgoing wires relay signals", tone: "accent" },
    },
  });

  // Next: beacon 1 (or next in heap)
  const [secondU, secondD] = heap.shift()!;
  dist.set(secondU, secondD);

  frames.push({
    scene,
    codeLine: 13,
    caption: `We poll beacon ${secondU} at ${secondD} ms and lock its arrival time into the log book.`,
    state: {
      slots: buildSlots(n, dist, secondU),
      buckets: buildBuckets([...heap], times),
      counter: { label: "settled", value: `2 of ${n}` },
      status: { text: `beacon ${secondU} settled at ${secondD} ms`, tone: "teal" },
      note: { text: "beacon reached with shortest delay", tone: "teal" },
    },
  });

  // Next: beacon 3
  if (heap.length > 0) {
    const [thirdU, thirdD] = heap.shift()!;
    dist.set(thirdU, thirdD);

    for (const [v, w] of adj.get(thirdU) ?? []) {
      heap.push([v, thirdD + w]);
    }
    heap.sort((a, b) => a[1] - b[1]);

    frames.push({
      scene,
      codeLine: 16,
      caption: `Beacon ${thirdU} is locked at ${thirdD} ms, spreading its pulse onward to beacon 4.`,
      state: {
        slots: buildSlots(n, dist, thirdU),
        buckets: buildBuckets([...heap], times),
        counter: { label: "settled", value: `${dist.size} of ${n}` },
        status: { text: `pulse reaches beacon 4 at ${thirdD + 1} ms`, tone: "accent" },
        note: { text: "frontier continues forward", tone: "accent" },
      },
    });
  }

  frames.push({
    scene,
    codeLine: 12,
    caption: "If a beacon has already locked its shortest time, we skip it to avoid the stale heap entry trap.",
    state: {
      slots: buildSlots(n, dist),
      buckets: buildBuckets([...heap], times),
      counter: { label: "trap avoidance", value: "skip stale" },
      status: { text: "stale duplicates are safely ignored", tone: "teal" },
      note: { text: "protects against redundant heap entries", tone: "teal" },
    },
  });

  // Settle remaining
  while (heap.length > 0) {
    const [u, d] = heap.shift()!;
    if (dist.has(u)) continue;
    dist.set(u, d);
    for (const [v, w] of adj.get(u) ?? []) {
      if (!dist.has(v)) heap.push([v, d + w]);
    }
    heap.sort((a, b) => a[1] - b[1]);
  }

  let maxTime = 0;
  for (const d of dist.values()) {
    if (d > maxTime) maxTime = d;
  }
  const finalAns = dist.size < n ? -1 : maxTime;

  frames.push({
    scene,
    codeLine: 21,
    caption: `All ${n} beacons received the signal, and the maximum delay is ${maxTime} ms, so the final answer is ${finalAns}.`,
    state: {
      slots: buildSlots(n, dist),
      buckets: buildBuckets([], times),
      counter: { label: "all settled", value: `${dist.size} of ${n}` },
      status: { text: `all beacons reached, delay is ${finalAns}`, tone: "teal" },
      note: { text: "maximum distance is the network delay", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Time: O((V + E) log V). Every edge and beacon is added and polled from the min-heap in logarithmic steps.",
    state: {
      slots: buildSlots(n, dist),
      buckets: buildBuckets([], times),
      counter: { label: "time complexity", value: "O((V + E) log V)" },
      status: { text: "logarithmic priority queue operations", tone: "teal" },
      note: { text: "each wire relaxed at most once", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Space: O(V + E). The network connection list, distance map, and min-heap hold all beacons and edges.",
    state: {
      slots: buildSlots(n, dist),
      buckets: buildBuckets([], times),
      counter: { label: "space complexity", value: "O(V + E)" },
      status: { text: "stores graph, distance, and heap", tone: "teal" },
      note: { text: "linear in vertices and edges", tone: "teal" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const dummyDist = new Map<number, number>([
    [1, 1],
    [2, 0],
    [3, 1],
    [4, 2],
  ]);
  const dummyTimes: [number, number, number][] = [
    [2, 1, 1],
    [2, 3, 1],
    [3, 4, 1],
  ];

  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "What should we return if one or more beacons cannot be reached?",
    options: [
      "Return -1 because the whole network was not reached.",
      "Return 0 because time stops.",
      "Return the highest time of reached beacons.",
    ],
    answer: 0,
    why: "If settled count is less than n, the broadcast signal could not reach every beacon.",
  };

  frames.push({
    scene,
    caption: "Let us review key rules for finding the network signal delay.",
    state: {
      slots: buildSlots(4, dummyDist),
      buckets: buildBuckets([], dummyTimes),
      counter: { label: "review", value: "unreachable check" },
      status: { text: "check all beacon coverage", tone: "accent" },
      note: { text: "what if coverage fails?", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Correct. If fewer than n beacons were settled, return -1.",
    state: {
      slots: buildSlots(4, dummyDist),
      buckets: buildBuckets([], dummyTimes),
      counter: { label: "review", value: "return -1" },
      status: { text: "unreachable nodes yield -1", tone: "teal" },
      note: { text: "only full networks return maximum delay", tone: "teal" },
    },
  });

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why do we skip a beacon polled from the heap if it is already in our map?",
    options: [
      "It is a stale entry with a longer distance than already recorded.",
      "It represents a negative time cycle.",
      "It would cause an infinite loop in the heap.",
    ],
    answer: 0,
    why: "A shorter path reached and settled this beacon earlier, so this entry is obsolete.",
  };

  frames.push({
    scene,
    caption: "Think about why the heap might offer the same beacon again.",
    state: {
      slots: buildSlots(4, dummyDist),
      buckets: buildBuckets([], dummyTimes),
      counter: { label: "review", value: "stale entries" },
      status: { text: "skipping stale heap records", tone: "accent" },
      note: { text: "avoid redundant processing", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Correct. Earlier, shorter paths lock the beacon first, making later entries stale.",
    state: {
      slots: buildSlots(4, dummyDist),
      buckets: buildBuckets([], dummyTimes),
      counter: { label: "review", value: "stale skipped" },
      status: { text: "stale entries skipped cleanly", tone: "teal" },
      note: { text: "keeps runtime within bounds", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Remember the relay beacon radio network: expand the smallest delay first and skip stale entries.",
    state: {
      slots: buildSlots(4, dummyDist),
      buckets: buildBuckets([], dummyTimes),
      counter: { label: "mastery", value: "complete" },
      status: { text: "network delay time mastered", tone: "teal" },
      note: { text: "dijkstra shortest path ready", tone: "teal" },
    },
  });

  return frames;
}

export const networkDelayTimeStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-743"],
  pattern: "Shortest path",
  trigger: "minimum time for all nodes to receive a signal from a starting node",
  insight: "Use Dijkstra with a min-heap to always expand the earliest signal pulse next. Record shortest times in a map, skip stale heap entries, and return the maximum delay once all nodes are reached.",
  metaphor: {
    name: "The relay beacon radio network",
    legend: "beacon = network node · radio tower = source k · relay pulse = signal edge · wave time = edge delay · log book = settled distance table",
    terms: ["beacon", "network", "pulse", "delay", "wave", "signal", "radio", "tower", "heap", "shortest", "log book", "frontier"],
  },
  traps: [{ name: TRAP, rule: "Nodes can be added to the min-heap multiple times with shorter distances. When polling an entry, if the node is already finalized, skip it immediately." }],
  template: [
    "class Solution:",
    "    int networkDelayTime(int[][] times, int n, int k): Dijkstra with min-heap, skip stale entries, return max delay",
  ],
  complexity: {
    slow: "O(V²)",
    time: "O((V + E) log V)",
    timeWhy: "every edge and beacon is added and polled from the min-heap in logarithmic steps",
    space: "O(V + E)",
    spaceWhy: "the network connection list, distance map, and min-heap hold all beacons and edges",
  },
  code: CODE,
  examples: [
    {
      label: "4 beacons with signal originating at beacon 2",
      input: "times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2",
      expected: "2",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-787", title: "Cheapest Flights Within K Stops" },
    { slug: "lc-133", title: "Clone Graph" },
    { slug: "lc-286", title: "Walls and Gates" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const data = parseNetworkInput(input);
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
