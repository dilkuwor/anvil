import type { CellTone } from "@/components/learn/viz/primitives";

import { GrokNotebookView, type GrokNotebookState } from "../grok-notebook-view";
import type { ProblemStory, SceneId, StoryFrame } from "../types";

type Frame = StoryFrame<GrokNotebookState>;

/** Fresh row. Two values share the top count; a heap of every value would be oversized. */
const PRACTICE = "[4,4,1,1,2]\n2";

const CODE = [
  "Map<Integer, Integer> counts = new HashMap<>();",
  "for (int value : nums) counts.put(value, counts.getOrDefault(value, 0) + 1);",
  "List<List<Integer>> buckets = new ArrayList<>();",
  "for (int i = 0; i <= nums.length; i++) buckets.add(new ArrayList<>());",
  "for (Map.Entry<Integer, Integer> entry : counts.entrySet()) {",
  "    buckets.get(entry.getValue()).add(entry.getKey());",
  "}",
  "int[] out = new int[k];",
  "int size = 0;",
  "for (int freq = nums.length; freq >= 1 && size < k; freq--) {",
  "    for (int value : buckets.get(freq)) {",
  "        if (size == k) break;",
  "        out[size++] = value;",
  "    }",
  "}",
  "return out;",
];

function parse(raw: string): { nums: number[]; k: number } {
  const lines = raw.trim().split(/\n+/);
  const nums = (lines[0]?.match(/-?\d+/g) ?? []).map(Number);
  const k = Number((lines[1]?.match(/-?\d+/) ?? [String(nums[nums.length - 1] ?? 1)])[0]);
  if (lines.length < 2) return { nums: nums.slice(0, -1), k: nums[nums.length - 1] ?? 1 };
  return { nums, k };
}

function countMap(nums: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of nums) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function solve(nums: number[], k: number): number[] {
  const counts = countMap(nums);
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, freq] of counts) buckets[freq].push(value);
  const out: number[] = [];
  for (let freq = nums.length; freq >= 1 && out.length < k; freq--) {
    for (const value of buckets[freq]) {
      if (out.length === k) break;
      out.push(value);
    }
  }
  return out;
}

function fmt(values: number[]): string {
  return `[${values.join(",")}]`;
}

function picture(
  nums: number[],
  counts: Map<number, number>,
  paint: (index: number) => CellTone | null,
  extra?: Partial<GrokNotebookState> & { shelves?: GrokNotebookState["shelves"] },
): GrokNotebookState {
  return {
    rows: [
      {
        cells: nums.map((value, index) => ({
          value: String(value),
          tone: paint(index) ?? "idle",
          caption: String(index),
        })),
      },
    ],
    notebooks: [
      {
        title: "notebook (value → count)",
        entries: [...counts.entries()].map(([key, value]) => ({ key: String(key), value: String(value) })),
      },
    ],
    shelves: extra?.shelves ?? null,
    ...extra,
  };
}

function pictureFrames(nums: number[], k: number, out: number[]): Frame[] {
  const counts = countMap(nums);
  return [
    {
      scene: "picture",
      caption: `Each box is a number. We want the ${k} values that appear most often.`,
      state: picture(nums, new Map(), () => null),
    },
    {
      scene: "picture",
      caption: `The winners are ${out.join(" and ")}. Order among them does not matter.`,
      state: picture(nums, counts, (index) => (out.includes(nums[index]) ? "done" : "faded")),
    },
    {
      scene: "picture",
      caption: "A heap that holds every distinct value is oversized. We will use count shelves instead.",
      state: picture(nums, counts, () => "miss", {
        banner: { text: "Full-Heap Trap", tone: "coral" },
        shelves: [{ title: "heap of all", items: [...counts.keys()].map((value) => ({ text: String(value), tone: "miss" as CellTone })) }],
      }),
    },
  ];
}

function slowFrames(nums: number[], k: number): Frame[] {
  const counts = countMap(nums);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return [
    {
      scene: "slow",
      caption: "The slow way: count, then sort every distinct value by count.",
      state: picture(nums, counts, () => "window", { counter: { label: "distinct values", value: counts.size } }),
    },
    {
      scene: "slow",
      caption: `After sorting, take the first ${k}: ${ranked
        .slice(0, k)
        .map(([v]) => v)
        .join(", ")}. Sorting is O(n log n).`,
      state: picture(nums, counts, (index) => (ranked.slice(0, k).some(([v]) => v === nums[index]) ? "done" : "faded"), {
        counter: { label: "sorted", value: counts.size },
      }),
    },
  ];
}

function insightFrames(nums: number[]): Frame[] {
  const counts = countMap(nums);
  const n = nums.length;
  return [
    {
      scene: "insight",
      caption: `A count cannot exceed ${n}, so we can stand a shelf for each count and drop values onto the matching shelf.`,
      state: picture(nums, counts, () => "window"),
    },
    {
      scene: "insight",
      caption: "The Full-Heap Trap is piling every value into one huge heap, then popping. We only need k winners.",
      state: picture(nums, counts, () => "miss", {
        banner: { text: "Full-Heap Trap", tone: "coral" },
        shelves: [{ title: "huge heap", items: [...counts.keys()].map((value) => ({ text: String(value), tone: "miss" as CellTone })) }],
      }),
    },
    {
      scene: "insight",
      caption: "Read shelves from the high count down until k values are in hand.",
      state: picture(nums, counts, () => "done"),
    },
  ];
}

function solutionFrames(nums: number[], k: number, scene: SceneId = "solution", practice = false): Frame[] {
  const frames: Frame[] = [];
  const line = (index: number) => (practice ? undefined : index);
  const counts = new Map<number, number>();
  const out = solve(nums, k);

  frames.push({
    scene,
    caption: practice
      ? `Your turn, on a new row: [${nums.join(", ")}], k = ${k}. You fill the notebook, then the shelves.`
      : "Count first. The notebook stores how often each value appears.",
    codeLine: line(0),
    state: picture(nums, new Map(), () => null),
  });

  let askedCount = false;
  for (let i = 0; i < nums.length; i++) {
    const before = counts.get(nums[i]) ?? 0;
    if (practice && !askedCount) {
      askedCount = true;
      frames.push({
        scene,
        caption: `Read ${nums[i]}. Does the notebook already have a count for it?`,
        state: picture(nums, new Map(counts), (index) => (index === i ? "edge" : null)),
        quiz: {
          kind: "choice",
          question: "How does this box change the notebook?",
          options: before ? ["Leave the count as it is", "Add one to its count"] : ["Open a new count at 1", "Skip it"],
          answer: before ? 1 : 0,
          why: "Every box adds one to its value's count.",
        },
      });
    } else if (!practice && i < 3) {
      frames.push({
        scene,
        caption: `Read ${nums[i]}. Add one to its count in the notebook.`,
        codeLine: line(1),
        state: picture(nums, new Map(counts), (index) => (index === i ? "edge" : index < i ? "faded" : null)),
      });
    }
    counts.set(nums[i], before + 1);
  }
  frames.push({
    scene,
    caption: "Counting is done. Now drop each value onto the shelf of its count.",
    codeLine: line(5),
    state: picture(nums, counts, () => "window"),
  });

  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  let askedPlace = false;
  for (const [value, freq] of counts) {
    const place: Frame = {
      scene,
      caption: `${value} appeared ${freq} time${freq === 1 ? "" : "s"}. It belongs on shelf ${freq}.`,
      codeLine: line(5),
      state: picture(nums, counts, (index) => (nums[index] === value ? "hit" : "faded"), {
        shelves: [{ title: `shelf ${freq}`, items: [{ text: String(value), tone: "hit" }] }],
      }),
    };
    if ((practice || !askedPlace) && !askedPlace) {
      askedPlace = true;
      place.quiz = {
        kind: "choice",
        question: "A count cannot be larger than the row. Where does this value sit?",
        options: ["On a huge heap of every value", `On the shelf labelled ${freq}`],
        answer: 1,
        why: "The Full-Heap Trap is one heap of everything. Shelves are indexed by count.",
      };
    }
    frames.push(place);
    buckets[freq].push(value);
  }

  const taken: number[] = [];
  for (let freq = nums.length; freq >= 1 && taken.length < k; freq--) {
    if (!buckets[freq].length) continue;
    for (const value of buckets[freq]) {
      if (taken.length === k) break;
      taken.push(value);
      frames.push({
        scene,
        caption: `Read shelf ${freq}. Take ${value}. We now hold ${taken.length} of ${k}.`,
        codeLine: line(12),
        state: picture(nums, counts, (index) => (taken.includes(nums[index]) ? "done" : "faded"), {
          shelves: [{ title: "in hand", items: taken.map((item) => ({ text: String(item), tone: "done" as CellTone })) }],
          counter: { label: "held", value: taken.length },
        }),
      });
    }
  }

  frames.push({
    scene,
    caption: practice ? `Done. The answer is ${fmt(out)}. You filled the shelves.` : `The answer is ${fmt(out)}.`,
    codeLine: line(15),
    state: picture(nums, counts, (index) => (out.includes(nums[index]) ? "done" : "faded")),
  });
  if (!practice) {
    frames.push({
      scene,
      caption: `Time: O(n). Counting, placing, and reading shelves each touch n items at most.`,
      codeLine: 1,
      state: picture(nums, counts, () => "faded", { counter: { label: "boxes read", value: nums.length } }),
    });
    frames.push({
      scene,
      caption: `Space: O(n). The notebook and the shelves hold the distinct values.`,
      codeLine: 0,
      state: picture(nums, counts, () => "faded"),
    });
  }
  return frames;
}

export const topKFrequentStory: ProblemStory<GrokNotebookState> = {
  slugs: ["lc-347"],
  pattern: "Frequency count",
  trigger: "return the k values that appear most often. Order does not matter, and the answer is unique",
  insight: "Count in a notebook, then drop each value onto a shelf labelled by that count. Read from the high shelves down until you hold k.",
  metaphor: {
    name: "The count shelves",
    legend: "notebook = counts · shelf = bucket[count] · held = answer",
    terms: ["notebook", "shelf", "count"],
  },
  traps: [
    {
      name: "The Full-Heap Trap",
      rule: "Do not pile every value into a max-heap of size n. Keep k winners, or use count shelves.",
    },
  ],
  template: [
    "count each value;",
    "put value on shelf[count];",
    "read shelves from high count down until k are held;",
  ],
  complexity: {
    slow: "O(n log n)",
    time: "O(n)",
    timeWhy: "counting, placing, and reading shelves each touch n items at most",
    space: "O(n)",
    spaceWhy: "the notebook and n+1 shelves hold the distinct values",
  },
  code: CODE,
  examples: [
    { label: "[1,1,1,2,2,3] k=2", input: "[1,1,1,2,2,3]\n2", expected: "[1,2]" },
    { label: "[1] k=1", input: "[1]\n1", expected: "[1]" },
    { label: "[1,2,3] k=3", input: "[1,2,3]\n3", expected: "[1,2,3]" },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-215", title: "Kth Largest Element in an Array" },
    { slug: "lc-973", title: "K Closest Points to Origin" },
    { slug: "lc-895", title: "Maximum Frequency Stack" },
  ],
  answer: (input) => {
    const { nums, k } = parse(input);
    return fmt(solve(nums, k));
  },
  frames: (input) => {
    const { nums, k } = parse(input);
    const out = solve(nums, k);
    const practice = parse(PRACTICE);
    return [
      ...pictureFrames(nums, k, out),
      ...slowFrames(nums, k),
      ...insightFrames(nums),
      ...solutionFrames(nums, k),
      ...solutionFrames(practice.nums, practice.k, "card", true),
      {
        scene: "card",
        caption: "This is the picture to remember. Say the idea in your head first, then reveal the card.",
        state: picture(nums, countMap(nums), (index) => (out.includes(nums[index]) ? "done" : "faded")),
      },
    ];
  },
  View: GrokNotebookView,
};
