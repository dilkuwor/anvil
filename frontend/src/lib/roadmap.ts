import type { ProblemListItem } from "@/lib/api";

export type RoadmapStatus = "not_started" | "in_progress" | "completed";

export type RoadmapTopicDef = {
  id: string;
  title: string;
  description: string;
  prerequisites: string[];
  next: string[];
  relatedTags: string[];
  filterTag: string;
  x: number;
  y: number;
};

export type RoadmapTopic = RoadmapTopicDef & {
  solved: number;
  total: number;
  percent: number;
  status: RoadmapStatus;
  locked: boolean;
};

export const NODE_WIDTH = 196;
export const NODE_HEIGHT = 86;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 1320;

export const ROADMAP_TOPICS: RoadmapTopicDef[] = [
  {
    id: "arrays-hashing",
    title: "Arrays & Hashing",
    description: "Indexing, frequency maps, and the core patterns most interviews start with.",
    prerequisites: [],
    next: ["two-pointers", "stack-queue", "intervals"],
    relatedTags: ["array", "hashmap", "string"],
    filterTag: "array",
    x: 542,
    y: 24,
  },
  {
    id: "two-pointers",
    title: "Two Pointers",
    description: "Walk a sequence from both ends or at two speeds.",
    prerequisites: ["arrays-hashing"],
    next: ["binary-search", "sliding-window", "linked-list"],
    relatedTags: ["two-pointers"],
    filterTag: "two-pointers",
    x: 292,
    y: 196,
  },
  {
    id: "stack-queue",
    title: "Stack & Queue",
    description: "LIFO/FIFO structure problems and monotonic stacks.",
    prerequisites: ["arrays-hashing"],
    next: ["linked-list"],
    relatedTags: ["stack", "queue"],
    filterTag: "stack",
    x: 792,
    y: 196,
  },
  {
    id: "binary-search",
    title: "Binary Search",
    description: "Logarithmic search on sorted ranges and answer spaces.",
    prerequisites: ["two-pointers"],
    next: ["trees"],
    relatedTags: ["binary-search"],
    filterTag: "binary-search",
    x: 142,
    y: 368,
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    description: "Maintain a moving range over arrays and strings.",
    prerequisites: ["two-pointers"],
    next: ["trees"],
    relatedTags: ["sliding-window"],
    filterTag: "sliding-window",
    x: 442,
    y: 368,
  },
  {
    id: "linked-list",
    title: "Linked List",
    description: "Pointer rewiring, cycles, and linear structure work.",
    prerequisites: ["two-pointers", "stack-queue"],
    next: ["trees"],
    relatedTags: ["linked-list"],
    filterTag: "linked-list",
    x: 742,
    y: 368,
  },
  {
    id: "intervals",
    title: "Intervals",
    description: "Merge, overlap, and schedule ranges.",
    prerequisites: ["arrays-hashing"],
    next: ["greedy"],
    relatedTags: ["array"],
    filterTag: "array",
    x: 1042,
    y: 368,
  },
  {
    id: "trees",
    title: "Trees",
    description: "Traversal, ancestry, and recursive structure.",
    prerequisites: ["binary-search", "sliding-window", "linked-list"],
    next: ["tries", "heap", "backtracking"],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 442,
    y: 548,
  },
  {
    id: "greedy",
    title: "Greedy",
    description: "Local choices that hold globally when the structure allows it.",
    prerequisites: ["intervals"],
    next: ["dp-1d"],
    relatedTags: ["array"],
    filterTag: "array",
    x: 1042,
    y: 548,
  },
  {
    id: "tries",
    title: "Tries",
    description: "Prefix trees for dictionaries and string search.",
    prerequisites: ["trees"],
    next: [],
    relatedTags: ["string", "tree"],
    filterTag: "string",
    x: 142,
    y: 728,
  },
  {
    id: "heap",
    title: "Heap / Priority Queue",
    description: "Ordered extraction and top-k selection.",
    prerequisites: ["trees"],
    next: ["graphs"],
    relatedTags: ["queue"],
    filterTag: "queue",
    x: 442,
    y: 728,
  },
  {
    id: "backtracking",
    title: "Backtracking",
    description: "Explore, prune, and assemble combinatorial answers.",
    prerequisites: ["trees"],
    next: ["graphs", "dp-1d"],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 742,
    y: 728,
  },
  {
    id: "graphs",
    title: "Graphs",
    description: "BFS, DFS, and connectivity on explicit graphs.",
    prerequisites: ["backtracking"],
    next: ["advanced-graphs", "dp-2d"],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 292,
    y: 908,
  },
  {
    id: "dp-1d",
    title: "1-D Dynamic Programming",
    description: "Linear recurrences and overlapping subproblems.",
    prerequisites: ["backtracking"],
    next: ["dp-2d"],
    relatedTags: ["dynamic-programming"],
    filterTag: "dynamic-programming",
    x: 742,
    y: 908,
  },
  {
    id: "bit-manipulation",
    title: "Bit Manipulation",
    description: "Masks, parity, and bit-level arithmetic tricks.",
    prerequisites: ["arrays-hashing"],
    next: [],
    relatedTags: ["math"],
    filterTag: "math",
    x: 1042,
    y: 908,
  },
  {
    id: "advanced-graphs",
    title: "Advanced Graphs",
    description: "Shortest paths, topological order, and union-find.",
    prerequisites: ["graphs"],
    next: [],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 292,
    y: 1088,
  },
  {
    id: "dp-2d",
    title: "2-D Dynamic Programming",
    description: "Grids, pairs of sequences, and two-index recurrences.",
    prerequisites: ["graphs", "dp-1d"],
    next: [],
    relatedTags: ["dynamic-programming"],
    filterTag: "dynamic-programming",
    x: 742,
    y: 1088,
  },
  {
    id: "math-geometry",
    title: "Math & Geometry",
    description: "Number theory, coordinates, and constructive math.",
    prerequisites: ["arrays-hashing"],
    next: [],
    relatedTags: ["math"],
    filterTag: "math",
    x: 1042,
    y: 1088,
  },
];

export function topicStatus(solved: number, total: number, attempted = false): RoadmapStatus {
  if (total > 0 && solved >= total) return "completed";
  if (solved > 0 || attempted) return "in_progress";
  return "not_started";
}

export function isPrerequisiteMet(topic: RoadmapTopic): boolean {
  return topic.total === 0 || topic.status !== "not_started" || topic.percent === 100;
}

export function hydrateRoadmap(problems: ProblemListItem[]): RoadmapTopic[] {
  const byId = new Map<string, RoadmapTopic>();
  for (const def of ROADMAP_TOPICS) {
    const matching = problems.filter((problem) =>
      problem.tags.some((tag) => def.relatedTags.includes(tag.slug)),
    );
    const unique = [...new Map(matching.map((problem) => [problem.id, problem])).values()];
    const solved = unique.filter((problem) => problem.status === "SOLVED").length;
    const attempted = unique.some((problem) => problem.status === "ATTEMPTED" || problem.status === "SOLVED");
    const total = unique.length;
    const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
    byId.set(def.id, {
      ...def,
      solved,
      total,
      percent,
      status: topicStatus(solved, total, attempted),
      locked: false,
    });
  }

  return ROADMAP_TOPICS.map((def) => {
    const topic = byId.get(def.id)!;
    const prereqs = def.prerequisites
      .map((id) => byId.get(id))
      .filter((item): item is RoadmapTopic => Boolean(item));
    const blocking = prereqs.filter((item) => item.total > 0 && item.status === "not_started");
    return { ...topic, locked: blocking.length > 0 && blocking.length === prereqs.length && prereqs.length > 0 };
  });
}

export function recommendNextTopic(topics: RoadmapTopic[]): RoadmapTopic | null {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const unlocked = topics.filter((topic) => {
    if (topic.locked || topic.status === "completed") return false;
    if (topic.total === 0) return false;
    return topic.prerequisites.every((id) => {
      const prereq = byId.get(id);
      return !prereq || isPrerequisiteMet(prereq);
    });
  });
  if (!unlocked.length) return null;
  const inProgress = unlocked.filter((topic) => topic.status === "in_progress");
  const pool = inProgress.length ? inProgress : unlocked;
  return [...pool].sort((a, b) => a.percent - b.percent || a.y - b.y || a.x - b.x)[0] ?? null;
}

export function roadmapEdges(topics: RoadmapTopicDef[] = ROADMAP_TOPICS): { from: string; to: string }[] {
  const ids = new Set(topics.map((topic) => topic.id));
  const edges: { from: string; to: string }[] = [];
  for (const topic of topics) {
    for (const next of topic.next) {
      if (ids.has(next)) edges.push({ from: topic.id, to: next });
    }
  }
  return edges;
}
