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

export const NODE_WIDTH = 276;
export const NODE_HEIGHT = 124;
export const CANVAS_WIDTH = 1636;
export const CANVAS_HEIGHT = 1380;

export const ROADMAP_TOPICS: RoadmapTopicDef[] = [
  {
    id: "arrays-hashing",
    title: "Arrays & Hashing",
    description: "Indexing, frequency maps, and the core patterns most interviews start with.",
    prerequisites: [],
    next: ["two-pointers", "stack-queue", "intervals", "bit-manipulation", "math-geometry"],
    relatedTags: ["array", "hashmap", "string"],
    filterTag: "array",
    x: 680,
    y: 40,
  },
  {
    id: "two-pointers",
    title: "Two Pointers",
    description: "Walk a sequence from both ends or at two speeds.",
    prerequisites: ["arrays-hashing"],
    next: ["binary-search", "sliding-window", "linked-list"],
    relatedTags: ["two-pointers"],
    filterTag: "two-pointers",
    x: 40,
    y: 236,
  },
  {
    id: "stack-queue",
    title: "Stack & Queue",
    description: "LIFO/FIFO structure problems and monotonic stacks.",
    prerequisites: ["arrays-hashing"],
    next: ["linked-list"],
    relatedTags: ["stack", "queue"],
    filterTag: "stack",
    x: 360,
    y: 236,
  },
  {
    id: "binary-search",
    title: "Binary Search",
    description: "Logarithmic search on sorted ranges and answer spaces.",
    prerequisites: ["two-pointers"],
    next: ["trees"],
    relatedTags: ["binary-search"],
    filterTag: "binary-search",
    x: 40,
    y: 432,
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    description: "Maintain a moving range over arrays and strings.",
    prerequisites: ["two-pointers"],
    next: ["trees"],
    relatedTags: ["sliding-window"],
    filterTag: "sliding-window",
    x: 360,
    y: 432,
  },
  {
    id: "linked-list",
    title: "Linked List",
    description: "Pointer rewiring, cycles, and linear structure work.",
    prerequisites: ["two-pointers", "stack-queue"],
    next: ["trees"],
    relatedTags: ["linked-list"],
    filterTag: "linked-list",
    x: 680,
    y: 432,
  },
  {
    id: "intervals",
    title: "Intervals",
    description: "Merge, overlap, and schedule ranges.",
    prerequisites: ["arrays-hashing"],
    next: ["greedy"],
    relatedTags: ["array"],
    filterTag: "array",
    x: 1000,
    y: 236,
  },
  {
    id: "trees",
    title: "Trees",
    description: "Traversal, ancestry, and recursive structure.",
    prerequisites: ["binary-search", "sliding-window", "linked-list"],
    next: ["tries", "heap", "backtracking"],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 360,
    y: 628,
  },
  {
    id: "greedy",
    title: "Greedy",
    description: "Local choices that hold globally when the structure allows it.",
    prerequisites: ["intervals"],
    next: ["dp-1d"],
    relatedTags: ["array"],
    filterTag: "array",
    x: 1000,
    y: 432,
  },
  {
    id: "tries",
    title: "Tries",
    description: "Prefix trees for dictionaries and string search.",
    prerequisites: ["trees"],
    next: [],
    relatedTags: ["string", "tree"],
    filterTag: "string",
    x: 40,
    y: 824,
  },
  {
    id: "heap",
    title: "Heap / Priority Queue",
    description: "Ordered extraction and top-k selection.",
    prerequisites: ["trees"],
    next: ["graphs"],
    relatedTags: ["queue"],
    filterTag: "queue",
    x: 360,
    y: 824,
  },
  {
    id: "backtracking",
    title: "Backtracking",
    description: "Explore, prune, and assemble combinatorial answers.",
    prerequisites: ["trees"],
    next: ["graphs", "dp-1d"],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 680,
    y: 824,
  },
  {
    id: "graphs",
    title: "Graphs",
    description: "BFS, DFS, and connectivity on explicit graphs.",
    prerequisites: ["backtracking"],
    next: ["advanced-graphs", "dp-2d"],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 360,
    y: 1020,
  },
  {
    id: "dp-1d",
    title: "1-D Dynamic Programming",
    description: "Linear recurrences and overlapping subproblems.",
    prerequisites: ["backtracking"],
    next: ["dp-2d"],
    relatedTags: ["dynamic-programming"],
    filterTag: "dynamic-programming",
    x: 1000,
    y: 1020,
  },
  {
    id: "bit-manipulation",
    title: "Bit Manipulation",
    description: "Masks, parity, and bit-level arithmetic tricks.",
    prerequisites: ["arrays-hashing"],
    next: [],
    relatedTags: ["math"],
    filterTag: "math",
    x: 1320,
    y: 1020,
  },
  {
    id: "advanced-graphs",
    title: "Advanced Graphs",
    description: "Shortest paths, topological order, and union-find.",
    prerequisites: ["graphs"],
    next: [],
    relatedTags: ["tree"],
    filterTag: "tree",
    x: 360,
    y: 1216,
  },
  {
    id: "dp-2d",
    title: "2-D Dynamic Programming",
    description: "Grids, pairs of sequences, and two-index recurrences.",
    prerequisites: ["graphs", "dp-1d"],
    next: [],
    relatedTags: ["dynamic-programming"],
    filterTag: "dynamic-programming",
    x: 680,
    y: 1216,
  },
  {
    id: "math-geometry",
    title: "Math & Geometry",
    description: "Number theory, coordinates, and constructive math.",
    prerequisites: ["arrays-hashing"],
    next: [],
    relatedTags: ["math"],
    filterTag: "math",
    x: 1320,
    y: 1216,
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

export function relatedTopicIds(topic: RoadmapTopic | RoadmapTopicDef | undefined): Set<string> {
  const ids = new Set<string>();
  if (!topic) return ids;
  ids.add(topic.id);
  for (const id of topic.prerequisites) ids.add(id);
  for (const id of topic.next) ids.add(id);
  return ids;
}

const SIDE_RAIL_VIA: Record<string, string> = {
  "bit-manipulation": "intervals",
  "math-geometry": "greedy",
};

export function roadmapEdgePath(
  from: { id?: string; x: number; y: number },
  to: { id?: string; x: number; y: number },
): string {
  const viaId = to.id ? SIDE_RAIL_VIA[to.id] : undefined;
  const via = viaId ? ROADMAP_TOPICS.find((topic) => topic.id === viaId) : undefined;
  if (via) return sideRailElbow(from, via, to);

  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y;
  const dy = Math.max(y2 - y1, 1);
  const cp = Math.max(36, Math.min(160, dy * 0.38));
  return `M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`;
}

function sideRailElbow(
  from: { x: number; y: number },
  via: { id?: string; x: number; y: number },
  to: { x: number; y: number },
): string {
  const startX = from.x + NODE_WIDTH / 2;
  const startY = from.y + NODE_HEIGHT;
  const endX = to.x + NODE_WIDTH / 2;
  const endY = to.y;
  const gutterY = startY + (via.id === "greedy" ? 40 : 22);
  const laneX = via.x + NODE_WIDTH + (via.id === "greedy" ? 32 : 16);
  const radius = Math.min(16, gutterY - startY - 2, (laneX - startX) / 4, (endX - laneX) / 4);
  return [
    `M ${startX} ${startY}`,
    `L ${startX} ${gutterY - radius}`,
    `Q ${startX} ${gutterY} ${startX + radius} ${gutterY}`,
    `L ${laneX - radius} ${gutterY}`,
    `Q ${laneX} ${gutterY} ${laneX} ${gutterY + radius}`,
    `L ${laneX} ${endY - radius}`,
    `Q ${laneX} ${endY} ${laneX + radius} ${endY}`,
    `L ${endX} ${endY}`,
  ].join(" ");
}

export function readableRoadmapScale(viewWidth: number): number {
  const pad = 56;
  const widthScale = Math.max(0.2, (viewWidth - pad) / CANVAS_WIDTH);
  const floor = viewWidth < 640 ? 0.78 : viewWidth < 1024 ? 0.86 : 0.94;
  const ceiling = 1.12;
  return Math.min(ceiling, Math.max(floor, widthScale));
}

export function roadmapContentBounds(topics: { x: number; y: number }[] = ROADMAP_TOPICS) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const topic of topics) {
    minX = Math.min(minX, topic.x);
    minY = Math.min(minY, topic.y);
    maxX = Math.max(maxX, topic.x + NODE_WIDTH);
    maxY = Math.max(maxY, topic.y + NODE_HEIGHT);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function fitRoadmapView(viewWidth: number, viewHeight: number, topics: { x: number; y: number }[] = ROADMAP_TOPICS) {
  const bounds = roadmapContentBounds(topics);
  const padX = 40;
  const padTop = 64;
  const padBottom = 28;
  const availW = Math.max(80, viewWidth - padX * 2);
  const availH = Math.max(80, viewHeight - padTop - padBottom);
  const scale = Math.max(0.2, Math.min(availW / bounds.width, availH / bounds.height, 1.12));
  const tx = (viewWidth - bounds.width * scale) / 2 - bounds.minX * scale;
  const ty = padTop + (availH - bounds.height * scale) / 2 - bounds.minY * scale;
  return { scale, tx, ty };
}
