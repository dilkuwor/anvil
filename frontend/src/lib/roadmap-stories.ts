import { getStory } from "@/components/story/registry";

import { ROADMAP_TOPICS } from "./roadmap";

export type KeystoneStory = {
  slug: string;
  title: string;
  topicId: string;
  metaphor: string;
  trap: string;
  insight: string;
  isPrimary: boolean;
  prereqSlug?: string;
  order: number;
};

/**
 * The 21 Keystone Visual Stories organized by topic and curriculum dependency order.
 * Primary keystones unlock the topic family. Downstream keystones build upon the anchor.
 */
const CURRICULUM: KeystoneStory[] = [
  // 1. Arrays & Hashing
  {
    slug: "lc-146",
    title: "LRU Cache",
    topicId: "arrays-hashing",
    metaphor: "Fast Register & VIP Rope",
    trap: "The Phantom Lookup Desync",
    insight: "Hash map gives O(1) key-to-node jump; doubly-linked list gives O(1) splice to head and tail eviction.",
    isPrimary: true,
    order: 1,
  },
  // 2. Two Pointers
  {
    slug: "lc-11",
    title: "Container With Most Water",
    topicId: "two-pointers",
    metaphor: "Inward Squeezing Calipers",
    trap: "The Taller Pillar Fallacy",
    insight: "Move whichever wall is shorter. Moving the taller wall can only decrease width while capped by the shorter wall.",
    isPrimary: true,
    order: 2,
  },
  {
    slug: "lc-15",
    title: "3Sum",
    topicId: "two-pointers",
    metaphor: "Anchor Peg & Calipers",
    trap: "The Clone Triplet Echo",
    insight: "Sort first, freeze anchor i, and squeeze left/right calipers. Skip identical consecutive numbers to kill duplicates.",
    isPrimary: false,
    prereqSlug: "lc-11",
    order: 3,
  },
  {
    slug: "lc-42",
    title: "Trapping Rain Water",
    topicId: "two-pointers",
    metaphor: "Mountain Ridge Reservoir",
    trap: "The Center Leaker Fallacy",
    insight: "Water above any bar is min(leftMax, rightMax) - height. Squeeze inward from the shorter outer ridge.",
    isPrimary: false,
    prereqSlug: "lc-11",
    order: 4,
  },
  // 3. Stack & Queue
  {
    slug: "lc-739",
    title: "Daily Temperatures",
    topicId: "stack-queue",
    metaphor: "Monotonic Silhouette Chamber",
    trap: "The Value vs Index Mirage",
    insight: "Stack colder un-warmed days by index. Any warmer day resolves and pops every colder day beneath it.",
    isPrimary: true,
    order: 5,
  },
  {
    slug: "lc-84",
    title: "Largest Rectangle in Histogram",
    topicId: "stack-queue",
    metaphor: "Widening Pillar Horizon",
    trap: "The Unflushed Baseline Ghost",
    insight: "A bar can only stretch sideways as long as neighbors are at least as tall. Popping a taller bar fixes its exact width.",
    isPrimary: false,
    prereqSlug: "lc-739",
    order: 6,
  },
  // 4. Binary Search
  {
    slug: "lc-875",
    title: "Koko Eating Bananas",
    topicId: "binary-search",
    metaphor: "Feast Speed Dial",
    trap: "The Truncation Starve",
    insight: "Binary search on the answer speed k in [1, max(piles)]. If hours <= h, squeeze speed down; otherwise speed up.",
    isPrimary: true,
    order: 7,
  },
  {
    slug: "lc-33",
    title: "Search in Rotated Sorted Array",
    topicId: "binary-search",
    metaphor: "Broken Escarpment Cliff",
    trap: "The Broken Slope Mirage",
    insight: "Mid splits the circle into one clean sorted half and one jagged half. Test the clean half first.",
    isPrimary: false,
    prereqSlug: "lc-875",
    order: 8,
  },
  // 5. Sliding Window
  {
    slug: "lc-3",
    title: "Longest Substring Without Repeating",
    topicId: "sliding-window",
    metaphor: "The Elastic Caterpillar",
    trap: "The Ghost Trap",
    insight: "Expand right until duplicate; snap left past previous duplicate without ever moving backwards.",
    isPrimary: true,
    order: 9,
  },
  {
    slug: "lc-76",
    title: "Minimum Window Substring",
    topicId: "sliding-window",
    metaphor: "Accordion Net & Letter Needs",
    trap: "The Premature Shrink Slip",
    insight: "Expand right until all required character counts match; contract left while requirement is still satisfied.",
    isPrimary: false,
    prereqSlug: "lc-3",
    order: 10,
  },
  // 6. Linked List
  {
    slug: "lc-141",
    title: "Linked List Cycle",
    topicId: "linked-list",
    metaphor: "Tortoise & Hare Track",
    trap: "The Null Dereference Stride",
    insight: "Slow steps 1, Fast steps 2. If a cycle exists, Fast closes the gap by 1 node every tick until collision.",
    isPrimary: true,
    order: 11,
  },
  {
    slug: "lc-206",
    title: "Reverse Linked List",
    topicId: "linked-list",
    metaphor: "Magnetic Train Couplers",
    trap: "The Severed Caboose Drift",
    insight: "Stash curr.next before rewiring, flip curr.next = prev, slide prev and curr forward.",
    isPrimary: false,
    prereqSlug: "lc-141",
    order: 12,
  },
  {
    slug: "lc-25",
    title: "Reverse Nodes in k-Group",
    topicId: "linked-list",
    metaphor: "Boxcar Shunting Yard",
    trap: "The Leftover Reversal Blunder",
    insight: "Count k nodes ahead with getKth(). If fewer than k nodes remain, stop. Otherwise reverse chunk and stitch.",
    isPrimary: false,
    prereqSlug: "lc-206",
    order: 13,
  },
  // 7. Intervals
  {
    slug: "lc-56",
    title: "Merge Intervals",
    topicId: "intervals",
    metaphor: "Magnetic Timeline Smear",
    trap: "The Unsorted Overlap Mirage",
    insight: "Sort by start time. If current start <= previous end, merge by extending end = max(prev.end, curr.end).",
    isPrimary: true,
    order: 14,
  },
  // 8. Trees
  {
    slug: "lc-102",
    title: "Binary Tree Level Order Traversal",
    topicId: "trees",
    metaphor: "Wavefront Elevator Floors",
    trap: "The Shifting Horizon Leak",
    insight: "Snapshot queue.length at the start of each while-loop iteration to process exactly one floor at a time.",
    isPrimary: true,
    order: 15,
  },
  {
    slug: "lc-236",
    title: "Lowest Common Ancestor",
    topicId: "trees",
    metaphor: "Beacon Searchlights",
    trap: "The Premature Split Halt",
    insight: "If root matches p or q, return root. Recurse left and right; if both branches return a beacon, root is the LCA.",
    isPrimary: false,
    prereqSlug: "lc-102",
    order: 16,
  },
  // 9. Graphs
  {
    slug: "lc-200",
    title: "Number of Islands",
    topicId: "graphs",
    metaphor: "Sinking Grid Continents",
    trap: "The Eternal Ping-Pong",
    insight: "Scan cells for unvisited land ('1'). Trigger DFS/BFS to sink all adjacent land to water ('0') before continuing.",
    isPrimary: true,
    order: 17,
  },
  {
    slug: "lc-994",
    title: "Rotting Oranges",
    topicId: "graphs",
    metaphor: "Toxic Slime Contagion Grid",
    trap: "The Single-Source Slowness",
    insight: "Seed all rotten oranges into the BFS queue at minute 0. Expand in 4 directions level-by-level.",
    isPrimary: false,
    prereqSlug: "lc-200",
    order: 18,
  },
  // 10. Advanced Graphs
  {
    slug: "lc-207",
    title: "Course Schedule",
    topicId: "advanced-graphs",
    metaphor: "Domino Prerequisite Graph",
    trap: "The Deadlock Cycle Trap",
    insight: "Calculate in-degrees. Seed 0-indegree courses into a queue. Popping decrements neighbors; cycle exists if count < n.",
    isPrimary: true,
    order: 19,
  },
  // 11. 1-D DP
  {
    slug: "lc-322",
    title: "Coin Change",
    topicId: "dp-1d",
    metaphor: "Stepping-Stone Bridge",
    trap: "The Greedy Coin Trap",
    insight: "dp[a] = 1 + min(dp[a - coin] for coin in coins). Greedy choice fails on non-canonical denominations.",
    isPrimary: true,
    order: 20,
  },
  // 12. 2-D DP
  {
    slug: "lc-1143",
    title: "Longest Common Subsequence",
    topicId: "dp-2d",
    metaphor: "Matrix Stepping Grid",
    trap: "The Diagonal Skip Flaw",
    insight: "If s1[i-1] == s2[j-1], hop diagonally (1 + dp[i-1][j-1]). Else take max(dp[i-1][j], dp[i][j-1]).",
    isPrimary: true,
    order: 21,
  },
];

/**
 * The roadmap decides order, topic and prerequisites. The words come from the story itself,
 * so the roadmap can never show a different metaphor or trap name than the story teaches.
 */
export const KEYSTONE_STORIES: KeystoneStory[] = CURRICULUM.map((entry) => {
  const story = getStory(entry.slug);
  if (!story) return entry;
  return { ...entry, metaphor: story.metaphor.name, trap: story.traps[0]?.name ?? entry.trap, insight: story.insight };
});

const BY_SLUG = new Map<string, KeystoneStory>(
  KEYSTONE_STORIES.map((story) => [story.slug, story])
);

const BY_TOPIC = new Map<string, KeystoneStory[]>();
for (const story of KEYSTONE_STORIES) {
  const list = BY_TOPIC.get(story.topicId) ?? [];
  list.push(story);
  BY_TOPIC.set(story.topicId, list);
}

export function getTopicKeystones(topicId: string): KeystoneStory[] {
  return BY_TOPIC.get(topicId) ?? [];
}

export function getPrimaryKeystone(topicId: string): KeystoneStory | undefined {
  return (BY_TOPIC.get(topicId) ?? []).find((s) => s.isPrimary);
}

export function getKeystoneBySlug(slug: string): KeystoneStory | undefined {
  return BY_SLUG.get(slug);
}

export type KeystoneStatus = "not_started" | "watched" | "recalled";

export function getKeystoneStatus(
  slug: string,
  progress: Record<string, { watched: boolean; recalled: boolean }>
): KeystoneStatus {
  const p = progress[slug];
  if (!p) return "not_started";
  if (p.recalled) return "recalled";
  if (p.watched) return "watched";
  return "not_started";
}

/**
 * Determines the single next keystone story to recommend.
 * Follows curriculum order while respecting prerequisites:
 * 1. For downstream keystones, their direct prereqSlug must be recalled.
 * 2. For primary keystones, the roadmap topic's prerequisites must have their primary keystone recalled.
 */
export function recommendNextKeystone(
  progress: Record<string, { watched: boolean; recalled: boolean }>
): KeystoneStory | null {
  const topicMap = new Map(ROADMAP_TOPICS.map((t) => [t.id, t]));

  for (const story of KEYSTONE_STORIES) {
    // If already recalled, move to next
    if (progress[story.slug]?.recalled) {
      continue;
    }

    // Check downstream prereq
    if (story.prereqSlug && !progress[story.prereqSlug]?.recalled) {
      continue;
    }

    // Check topic prereqs for primary keystones
    if (story.isPrimary) {
      const topicDef = topicMap.get(story.topicId);
      if (topicDef && topicDef.prerequisites.length > 0) {
        const met = topicDef.prerequisites.every((prereqTopicId) => {
          const prereqPrimary = getPrimaryKeystone(prereqTopicId);
          return !prereqPrimary || progress[prereqPrimary.slug]?.recalled;
        });
        if (!met) continue;
      }
    }

    return story;
  }

  return null;
}
