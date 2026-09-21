import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '["Twitter","postTweet","postTweet","getNewsFeed"]  [[],[1,10],[1,20],[1]]';
const TRAP = "The Missing Author Trap";

const CODE = [
  "public void postTweet(int userId, int tweetId) {",
  "    tweets.computeIfAbsent(userId, id -> new ArrayList<>()).add(new int[]{clock++, tweetId});",
  "}",
  "",
  "public List<Integer> getNewsFeed(int userId) {",
  "    PriorityQueue<int[]> heap = new PriorityQueue<>((a, b) -> b[0] - a[0]);",
  "    Set<Integer> sources = new HashSet<>(following.getOrDefault(userId, Set.of()));",
  "    sources.add(userId);",
  "    for (int source : sources) {",
  "        List<int[]> posts = tweets.get(source);",
  "        if (posts == null) continue;",
  "        for (int i = posts.size() - 1; i >= 0 && i >= posts.size() - 10; i--) {",
  "            heap.add(posts.get(i));",
  "        }",
  "    }",
  "    List<Integer> feed = new ArrayList<>();",
  "    while (!heap.isEmpty() && feed.size() < 10) {",
  "        feed.add(heap.poll()[1]);",
  "    }",
  "    return feed;",
  "}",
  "",
  "public void follow(int followerId, int followeeId) {",
  "    if (followerId == followeeId) return;",
  "    following.computeIfAbsent(followerId, id -> new HashSet<>()).add(followeeId);",
  "}",
  "",
  "public void unfollow(int followerId, int followeeId) {",
  "    Set<Integer> set = following.get(followerId);",
  "    if (set != null) set.remove(followeeId);",
  "}",
];

type TwitterOp = { op: string; args: number[] };

function parseOps(input: string): TwitterOp[] {
  try {
    const raw = input.trim();
    const parts = raw.split(/\s{2,}|\t/);
    if (parts.length >= 2) {
      const ops = JSON.parse(parts[0]) as string[];
      const args = JSON.parse(parts[1]) as number[][];
      const result: TwitterOp[] = [];
      for (let i = 0; i < ops.length; i++) {
        if (ops[i] !== "Twitter") {
          result.push({ op: ops[i], args: args[i] ?? [] });
        }
      }
      return result;
    }
  } catch {
    // fallback
  }
  return [
    { op: "postTweet", args: [1, 5] },
    { op: "getNewsFeed", args: [1] },
    { op: "follow", args: [1, 2] },
    { op: "postTweet", args: [2, 6] },
    { op: "getNewsFeed", args: [1] },
    { op: "unfollow", args: [1, 2] },
    { op: "getNewsFeed", args: [1] },
  ];
}

class TwitterModel {
  clock = 0;
  tweets = new Map<number, { time: number; tweetId: number }[]>();
  following = new Map<number, Set<number>>();

  postTweet(userId: number, tweetId: number) {
    if (!this.tweets.has(userId)) this.tweets.set(userId, []);
    this.tweets.get(userId)!.push({ time: this.clock++, tweetId });
  }

  follow(follower: number, followee: number) {
    if (follower === followee) return;
    if (!this.following.has(follower)) this.following.set(follower, new Set());
    this.following.get(follower)!.add(followee);
  }

  unfollow(follower: number, followee: number) {
    this.following.get(follower)?.delete(followee);
  }

  getNewsFeed(userId: number): number[] {
    const sources = new Set<number>(this.following.get(userId) ?? []);
    sources.add(userId);
    const allPosts: { time: number; tweetId: number }[] = [];
    for (const s of sources) {
      const posts = this.tweets.get(s) ?? [];
      for (let i = posts.length - 1; i >= 0 && i >= posts.length - 10; i--) {
        allPosts.push(posts[i]);
      }
    }
    allPosts.sort((a, b) => b.time - a.time);
    return allPosts.slice(0, 10).map((p) => p.tweetId);
  }

  run(ops: TwitterOp[]): (number[] | null)[] {
    const out: (number[] | null)[] = [];
    for (const { op, args } of ops) {
      if (op === "postTweet") {
        this.postTweet(args[0], args[1]);
        out.push(null);
      } else if (op === "follow") {
        this.follow(args[0], args[1]);
        out.push(null);
      } else if (op === "unfollow") {
        this.unfollow(args[0], args[1]);
        out.push(null);
      } else if (op === "getNewsFeed") {
        out.push(this.getNewsFeed(args[0]));
      }
    }
    return out;
  }
}

function answerText(input: string): string {
  const ops = parseOps(input);
  const model = new TwitterModel();
  return JSON.stringify(model.run(ops));
}

function buildSlots(tweets: Map<number, { time: number; tweetId: number }[]>): DesignSlot[] {
  const slots: DesignSlot[] = [];
  for (const [u, posts] of tweets.entries()) {
    const latest = posts[posts.length - 1];
    slots.push({
      id: u,
      key: `Reporter ${u}`,
      val: `#${latest.tweetId}`,
      sub: `${posts.length} posts on wire`,
      tone: "hit",
    });
  }
  return slots;
}

function buildBuckets(
  following: Map<number, Set<number>>,
  tweets: Map<number, { time: number; tweetId: number }[]>,
): DesignBucket[] {
  const buckets: DesignBucket[] = [];
  for (const [u, set] of following.entries()) {
    const list = Array.from(set).map((f) => `follows ${f}`);
    buckets.push({
      id: u,
      label: `Reporter ${u} Subscriptions`,
      items: list.map((text) => ({ text, tone: "hit" as const })),
      tone: "hit",
    });
  }
  if (buckets.length === 0) {
    buckets.push({ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" });
  }
  return buckets;
}

function pictureFrames(): Frame[] {
  return [
    {
      scene: "picture",
      caption: "We want a social feed where reporters post news, follow other wires, and pull top 10 bulletins.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        counter: { label: "service", value: "Twitter" },
        note: { text: "broadcast newsroom wire", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Each reporter has a personal post wire and a subscription list of authors they follow.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        counter: { label: "feed size", value: "top 10" },
        note: { text: "wires and subscriptions", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "When generating a feed, we merge recent posts into a bulletin in reverse chronological order.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        counter: { label: "order", value: "newest first" },
        note: { text: "recent posts bulletin", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way gathers every past post from all followed reporters into a list and sorts all of them.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        counter: { label: "sort cost", value: "O(T log T)" },
        note: { text: "sorting all historical posts", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Sorting thousands of old posts wastes time when only the ten newest are needed for the bulletin.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        counter: { label: "overhead", value: "unneeded sorts" },
        note: { text: "sorting entire post histories", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "A max-heap merges only the top ten posts from each followed wire, keeping feed generation fast.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        counter: { label: "heap merge", value: "O(F log 10F)" },
        note: { text: "bounded heap stream merge", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Each user is their own reporter: their news feed must include their own posts alongside followed wires.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        note: { text: "include author own posts", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "Push up to ten recent posts per author into a max-heap, then poll the top ten to form the feed.",
      state: {
        slots: [],
        buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
        note: { text: "max heap grabs top 10", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(ops: TwitterOp[]): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const model = new TwitterModel();
  const outputs: (number[] | null)[] = [];
  let askedTrap = false;

  frames.push({
    scene,
    codeLine: 1,
    caption: "Set up tweet wire storage and subscription sets. Clock timer begins at zero.",
    state: {
      slots: [],
      buckets: buildBuckets(model.following, model.tweets),
      counter: { label: "active wires", value: 0 },
      note: { text: "newsroom wires ready", tone: "accent" },
    },
  });

  for (const { op, args } of ops) {
    if (op === "postTweet") {
      const [u, t] = args;
      model.postTweet(u, t);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 1,
        caption: `Reporter ${u} published tweet #${t} onto their wire bulletin.`,
        state: {
          slots: buildSlots(model.tweets),
          buckets: buildBuckets(model.following, model.tweets),
          activeOp: `postTweet(${u}, ${t})`,
          counter: { label: "total tweets", value: model.clock },
          note: { text: `user ${u} posted #${t}`, tone: "accent" },
        },
      });
    } else if (op === "follow") {
      const [follower, followee] = args;
      model.follow(follower, followee);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 24,
        caption: `Reporter ${follower} subscribed to wire of reporter ${followee}.`,
        state: {
          slots: buildSlots(model.tweets),
          buckets: buildBuckets(model.following, model.tweets),
          activeOp: `follow(${follower}, ${followee})`,
          counter: { label: "subscriptions", value: `user ${follower}` },
          note: { text: `${follower} follows ${followee}`, tone: "teal" },
        },
      });
    } else if (op === "unfollow") {
      const [follower, followee] = args;
      model.unfollow(follower, followee);
      outputs.push(null);

      frames.push({
        scene,
        codeLine: 29,
        caption: `Reporter ${follower} unsubscribed from wire of reporter ${followee}.`,
        state: {
          slots: buildSlots(model.tweets),
          buckets: buildBuckets(model.following, model.tweets),
          activeOp: `unfollow(${follower}, ${followee})`,
          counter: { label: "unfollowed", value: followee },
          note: { text: `unfollowed user ${followee}`, tone: "coral" },
        },
      });
    } else if (op === "getNewsFeed") {
      const userId = args[0];

      if (!askedTrap) {
        askedTrap = true;
        const trapQuiz: StoryQuiz = {
          kind: "choice",
          question: `When building the feed for reporter ${userId}, what must we do with the reporter's own ID?`,
          options: [
            "add the user's own ID to sources so their feed includes their own wire posts",
            "exclude the user's own ID so they only see posts from other wires",
          ],
          answer: 0,
          why: "A user expects to see their own published tweets in their news feed alongside followed accounts.",
        };

        frames.push({
          scene,
          codeLine: 7,
          caption: `${TRAP}: always include the user's own ID so their feed contains their own wire posts.`,
          state: {
            slots: buildSlots(model.tweets),
            buckets: buildBuckets(model.following, model.tweets),
            activeOp: `getNewsFeed(${userId})`,
            counter: { label: "trap check", value: "author's tweets" },
            note: { text: "include author's own ID", tone: "coral" },
          },
          quiz: trapQuiz,
        });

        frames.push({
          scene,
          codeLine: 8,
          caption: `Sources set prepared: author ${userId} plus all subscribed wires.`,
          state: {
            slots: buildSlots(model.tweets),
            buckets: buildBuckets(model.following, model.tweets),
            activeOp: `getNewsFeed(${userId})`,
            counter: { label: "sources", value: `user ${userId}` },
            note: { text: "sources include author", tone: "teal" },
          },
        });
      }

      const feed = model.getNewsFeed(userId);
      outputs.push(feed);

      frames.push({
        scene,
        codeLine: 19,
        caption: `Compiled feed for user ${userId}: top 10 wire bulletin is [${feed.join(", ")}].`,
        state: {
          slots: buildSlots(model.tweets),
          buckets: buildBuckets(model.following, model.tweets),
          activeOp: `getNewsFeed(${userId}) ➔ [${feed.join(", ")}]`,
          counter: { label: "feed items", value: feed.length },
          note: { text: `feed: [${feed.join(", ")}]`, tone: "teal" },
        },
      });
    }
  }

  frames.push({
    scene,
    codeLine: 19,
    caption: `All social wire operations executed. The answer is ${JSON.stringify(outputs)}.`,
    state: {
      slots: buildSlots(model.tweets),
      buckets: buildBuckets(model.following, model.tweets),
      counter: { label: "total operations", value: ops.length },
      note: { text: "feed operations complete", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 19,
    caption: "Time: O(F log(10 × F)). At most 10 tweets per friend are pushed into the max-heap.",
    state: {
      slots: buildSlots(model.tweets),
      buckets: buildBuckets(model.following, model.tweets),
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 19,
    caption: "Space: O(T + U). Memory holds T tweets and follow sets for U users.",
    state: {
      slots: buildSlots(model.tweets),
      buckets: buildBuckets(model.following, model.tweets),
      note: { text: "space complexity", tone: "accent" },
    },
  });

  return frames;
}

function cardFrames(): Frame[] {
  const scene: SceneId = "card";
  const frames: Frame[] = [];

  const quiz1: StoryQuiz = {
    kind: "choice",
    question: "When compiling a user's news feed from subscriptions, what must we do with the user's own ID?",
    options: [
      "add the user's own ID to the sources set so their feed includes their own wire posts",
      "exclude the user's own ID so they only see posts from other wires",
    ],
    answer: 0,
    why: "A user expects to see their own published tweets in their news feed alongside followed accounts.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "Why do we only push the latest 10 tweets from each followed user into the max-heap?",
    options: [
      "the feed only returns up to 10 tweets, so older tweets from any single author cannot qualify",
      "the heap array has a fixed capacity of 10 elements",
    ],
    answer: 0,
    why: "Since each author's tweets are in chronological order, any tweet older than the 10th newest cannot be in the global top 10.",
  };

  frames.push({
    scene,
    caption: "When designing a social feed, think of broadcast newsroom wires merging into a top 10 bulletin.",
    state: {
      slots: [],
      buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
      note: { text: "broadcast newsroom wires", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Always include the author's own ID in the sources set so they see their own published wire posts.",
    state: {
      slots: [],
      buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
      note: { text: "include author's own posts", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Limit heap entries to the top 10 tweets per friend to bound feed generation time.",
    state: {
      slots: [],
      buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
      note: { text: "bound heap entries", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the broadcast newsroom wire: combine followed wires with the author's own, heap top 10, and deliver bulletin.",
    state: {
      slots: [],
      buckets: [{ id: 0, label: "Subscriptions Wire", items: [], tone: "idle" }],
      note: { text: "twitter system ready", tone: "teal" },
    },
  });

  return frames;
}

export const designTwitterStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-355"],
  pattern: "Heap / Hash map",
  trigger: "social feed design with posting, following, and top-10 recent news feed",
  insight: "Store tweets per user and track friendships with follow sets. To build the feed, gather tweets from the user and followed accounts, merging them with a max-heap to extract the top ten.",
  metaphor: {
    name: "The broadcast newsroom wire",
    legend: "wire = user post list · reporter = user · subscription = follow set · bulletin = top 10 news feed",
    terms: ["wire", "reporter", "subscription", "bulletin", "feed", "tweet", "post", "heap", "follow", "broadcast"],
  },
  traps: [{ name: TRAP, rule: "Always add the user's own ID to the sources set so their feed includes their own tweets." }],
  template: [
    "class Twitter:",
    "    void postTweet(int userId, int tweetId): append to user tweet list with timestamp",
    "    List<Integer> getNewsFeed(int userId): merge user + followed tweets using max-heap, poll 10",
    "    void follow(int followerId, int followeeId): add to follower set",
    "    void unfollow(int followerId, int followeeId): remove from follower set",
  ],
  complexity: {
    slow: "O(T log T)",
    time: "O(F log(10 × F))",
    timeWhy: "we push at most ten tweets per followed user into the heap and extract the top ten",
    space: "O(T + U)",
    spaceWhy: "we store T total tweets and follow relationship sets for U users",
  },
  code: CODE,
  examples: [
    {
      label: "post follow getNewsFeed",
      input: '["Twitter","postTweet","getNewsFeed","follow","postTweet","getNewsFeed","unfollow","getNewsFeed"]  [[],[1,5],[1],[1,2],[2,6],[1],[1,2],[1]]',
      expected: "[null,[5],null,null,[6,5],null,[5]]",
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
    { slug: "lc-146", title: "LRU Cache" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const ops = parseOps(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(ops),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
