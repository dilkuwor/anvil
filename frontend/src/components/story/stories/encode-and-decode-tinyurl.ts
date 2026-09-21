import {
  AgyDesignSlotsView,
  type DesignBucket,
  type DesignSlot,
  type DesignSlotsState,
} from "../agy-design-slots-view";
import type { ProblemStory, SceneId, StoryFrame, StoryQuiz } from "../types";

type Frame = StoryFrame<DesignSlotsState>;

const PRACTICE = '"https://example.com/alpha"';
const TRAP = "The Hash Collision Trap";

const CODE = [
  "String encode(String longUrl) {",
  "    String key = toBase62(counter++);",
  "    byKey.put(key, longUrl);",
  "    return \"http://tinyurl.com/\" + key;",
  "}",
  "",
  "String decode(String shortUrl) {",
  "    String key = shortUrl.substring(shortUrl.lastIndexOf('/') + 1);",
  "    return byKey.get(key);",
  "}",
  "",
  "String toBase62(int value) {",
  "    StringBuilder sb = new StringBuilder();",
  "    while (value > 0) {",
  "        sb.append(ALPHABET.charAt(value % 62));",
  "        value /= 62;",
  "    }",
  "    return sb.reverse().toString();",
  "}",
];

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toBase62(value: number): string {
  if (value === 0) return "0";
  let v = value;
  let sb = "";
  while (v > 0) {
    sb = ALPHABET[v % 62] + sb;
    v = Math.floor(v / 62);
  }
  return sb;
}

function parseInput(input: string): string {
  try {
    const raw = input.trim();
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return JSON.parse(raw) as string;
    }
    return raw;
  } catch {
    return "https://leetcode.com/problems/design-tinyurl";
  }
}

function answerText(input: string): string {
  const longUrl = parseInput(input);
  return JSON.stringify(longUrl);
}

function pictureFrames(): Frame[] {
  return [
    {
      scene: "picture",
      caption: "We want a service that shortens long web URLs into compact tokens and decodes them back.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        counter: { label: "service", value: "TinyURL" },
        note: { text: "luggage claim ticket system", tone: "accent" },
      },
    },
    {
      scene: "picture",
      caption: "Each long URL receives a short claim ticket token derived from a counting number.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        counter: { label: "counter", value: 1 },
        note: { text: "counting token IDs", tone: "teal" },
      },
    },
    {
      scene: "picture",
      caption: "A hash map stores the ticket to URL mapping, allowing instant retrieval upon decoding.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        counter: { label: "lookup", value: "O(1)" },
        note: { text: "O(1) claim lookups", tone: "teal" },
      },
    },
  ];
}

function slowFrames(): Frame[] {
  return [
    {
      scene: "slow",
      caption: "The slow way stores URL pairs in an unindexed list and scans the entire list to decode.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        counter: { label: "decode cost", value: "O(N)" },
        note: { text: "linear list scan", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Scanning millions of registered URLs on every web redirect would cause massive server delays.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        counter: { label: "latency", value: "high" },
        note: { text: "unindexed linear bottleneck", tone: "coral" },
      },
    },
    {
      scene: "slow",
      caption: "Base62 tokens index directly into a hash map, returning the destination in constant time.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        counter: { label: "hash lookup", value: "O(1)" },
        note: { text: "instant hash table claim", tone: "teal" },
      },
    },
  ];
}

function insightFrames(): Frame[] {
  return [
    {
      scene: "insight",
      caption: "Base62 uses digits and upper and lowercase letters, packing huge numbers into tiny strings.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        note: { text: "62 alphanumeric characters", tone: "accent" },
      },
    },
    {
      scene: "insight",
      caption: "A counting number sequence guarantees every generated short ticket is completely unique.",
      state: {
        slots: [],
        buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
        note: { text: "collision-free tokens", tone: "teal" },
      },
    },
  ];
}

function solutionFrames(longUrl: string): Frame[] {
  const scene: SceneId = "solution";
  const frames: Frame[] = [];
  const token = toBase62(1);
  const shortUrl = `http://tinyurl.com/${token}`;

  const slots: DesignSlot[] = [
    {
      id: 1,
      key: `Token "${token}"`,
      val: "Claim #1",
      sub: "maps to URL",
      tone: "hit",
    },
  ];

  const buckets: DesignBucket[] = [
    {
      id: "claim",
      label: "Claim Room Map",
      items: [{ text: `${token} ➔ ${longUrl}`, tone: "hit" }],
      tone: "hit",
    },
  ];

  frames.push({
    scene,
    codeLine: 1,
    caption: `Generate next ticket id 1. Base62 conversion creates token "${token}".`,
    state: {
      slots: [],
      buckets: [{ id: "claim", label: "Claim Room Map", items: [], tone: "idle" }],
      counter: { label: "token id", value: 1 },
      note: { text: `ticket token "${token}" generated`, tone: "accent" },
    },
  });

  const trapQuiz: StoryQuiz = {
    kind: "choice",
    question: "Why should we avoid using a raw 32-bit string hash code as the short URL key?",
    options: [
      "hash codes can collide, causing different URLs to overwrite each other",
      "hash codes can only encode URLs that start with https",
    ],
    answer: 0,
    why: "Hash collisions are inevitable with 32-bit hashes. A steady counter guarantees distinct tokens.",
  };

  frames.push({
    scene,
    codeLine: 2,
    caption: `${TRAP}: avoid raw hash codes to prevent collisions; a steady counter guarantees unique tickets.`,
    state: {
      slots,
      buckets,
      activeOp: `encode("${longUrl}")`,
      counter: { label: "trap check", value: "hash collision" },
      note: { text: "unique counter avoids collisions", tone: "coral" },
    },
    quiz: trapQuiz,
  });

  frames.push({
    scene,
    codeLine: 3,
    caption: `Stored mapping "${token}" ➔ "${longUrl}". Return short URL "${shortUrl}".`,
    state: {
      slots,
      buckets,
      activeOp: `short URL: "${shortUrl}"`,
      counter: { label: "mapped", value: 1 },
      note: { text: `encoded to "${shortUrl}"`, tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 7,
    caption: `To decode, extract key "${token}" after the final slash and look up original URL.`,
    state: {
      slots,
      buckets,
      activeOp: `decode("${shortUrl}")`,
      counter: { label: "lookup key", value: token },
      note: { text: `extracted key "${token}"`, tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 8,
    caption: `Decoded original URL cleanly from claim room. The answer is "${longUrl}".`,
    state: {
      slots,
      buckets,
      activeOp: `decode complete`,
      counter: { label: "decoded", value: "match" },
      note: { text: "original URL restored", tone: "teal" },
    },
  });

  frames.push({
    scene,
    codeLine: 8,
    caption: "Time: O(1). Base62 takes at most 7 divisions, and hash lookups take constant time.",
    state: {
      slots,
      buckets,
      note: { text: "time complexity", tone: "accent" },
    },
  });

  frames.push({
    scene,
    codeLine: 8,
    caption: "Space: O(N). The hash map stores one string entry for each of the N registered URLs.",
    state: {
      slots,
      buckets,
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
    question: "Why is Base62 (0-9, a-z, A-Z) used for short URL tokens?",
    options: [
      "it uses URL-safe alphanumeric characters to represent numbers compactly",
      "it encrypts the long URL using private keys",
    ],
    answer: 0,
    why: "Base62 uses 62 alphanumeric characters that are safe in web URLs, packing large numbers into short strings.",
  };

  const quiz2: StoryQuiz = {
    kind: "choice",
    question: "How does decode find the original long URL in O(1) time?",
    options: [
      "extracts the token key after the last slash and looks it up in a hash map",
      "scans all stored URLs from oldest to newest",
    ],
    answer: 0,
    why: "The short token serves as a direct key in the hash map, retrieving the original URL in constant time.",
  };

  frames.push({
    scene,
    caption: "When designing a URL shortener, imagine luggage claim tickets backed by a steady counter ID.",
    state: {
      slots: [],
      buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
      note: { text: "base62 luggage claim ticket", tone: "accent" },
    },
    quiz: quiz1,
  });

  frames.push({
    scene,
    caption: "Avoid raw string hash codes: collisions overwrite valid records. Use unique counter IDs.",
    state: {
      slots: [],
      buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
      note: { text: "prevent hash collisions", tone: "teal" },
    },
  });

  frames.push({
    scene,
    caption: "Extract the token from the end of the short URL to look up the long URL in O(1) time.",
    state: {
      slots: [],
      buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
      note: { text: "O(1) claim retrieval", tone: "accent" },
    },
    quiz: quiz2,
  });

  frames.push({
    scene,
    caption: "Remember the luggage claim ticket: convert counter to Base62 tokens, avoid hash collisions, and decode in O(1).",
    state: {
      slots: [],
      buckets: [{ id: "claim", label: "Luggage Claim Room", items: [], tone: "idle" }],
      note: { text: "codec ready", tone: "teal" },
    },
  });

  return frames;
}

export const encodeAndDecodeTinyurlStory: ProblemStory<DesignSlotsState> = {
  slugs: ["lc-535"],
  pattern: "Base62 encoding",
  trigger: "shorten a long URL to a short key and decode it back",
  insight: "Assign an auto-incrementing integer ID to each new long URL and convert it to a Base62 string. A hash map stores the key to URL mapping, allowing instant retrieval upon decoding.",
  metaphor: {
    name: "The luggage claim ticket",
    legend: "luggage = long URL · ticket = short Base62 token · counter = auto-incrementing id · claim room = hash map",
    terms: ["ticket", "luggage", "token", "claim", "counter", "hash", "map", "url", "code", "encode"],
  },
  traps: [{ name: TRAP, rule: "Use an incremental counter to guarantee distinct short tokens for distinct URLs." }],
  template: [
    "class Codec:",
    "    String encode(String longUrl): convert counter to Base62, store in map, return short URL",
    "    String decode(String shortUrl): extract token after slash, look up original URL",
  ],
  complexity: {
    slow: "O(N)",
    time: "O(1)",
    timeWhy: "converting an integer to Base62 requires at most 7 divisions, and hash lookups take O(1) time",
    space: "O(N)",
    spaceWhy: "the hash map stores one string entry for each of the N registered URLs",
  },
  code: CODE,
  examples: [
    {
      label: "leetcode problem URL",
      input: '"https://leetcode.com/problems/design-tinyurl"',
      expected: '"https://leetcode.com/problems/design-tinyurl"',
    },
  ],
  practiceInput: PRACTICE,
  siblings: [
    { slug: "lc-380", title: "Insert Delete GetRandom O(1)" },
    { slug: "lc-706", title: "Design HashMap" },
  ],
  answer: (input) => answerText(input),
  frames: (input) => {
    const longUrl = parseInput(input);
    return [
      ...pictureFrames(),
      ...slowFrames(),
      ...insightFrames(),
      ...solutionFrames(longUrl),
      ...cardFrames(),
    ];
  },
  View: AgyDesignSlotsView,
};
