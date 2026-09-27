import { describe, expect, it } from "vitest";

import { buildLessonSpeech, MAX_SECTION_CHARS, speakCode, speakInline } from "@/lib/lesson-speech";

const CONTENT = `# Hashing

A hash map gives O(1) lookup.

## Mental Model

Inner search → Hash lookup → One pass

| Problem asks | Key on |
| --- | --- |
| Find a pair | The complement, \`target - x\` |

## How It Works

**1. Seen set** — have I seen this before?

\`\`\`java
Set<Integer> seen = new HashSet<>();
\`\`\`

\`\`\`java
seen.add(x);
\`\`\`

> Tip: say the key out loud.

1. Clarify the input.
2. Name the key.

Throughput = requests ÷ seconds
`;

describe("buildLessonSpeech", () => {
  const sections = buildLessonSpeech({
    title: "Hashing",
    short_description: "Choose the key.",
    content: CONTENT,
    takeaways: ["State the key."],
  });

  it("makes one section per heading, plus intro and takeaways", () => {
    expect(sections.map((section) => section.id)).toEqual(["intro", "mental-model", "how-it-works", "takeaways"]);
    expect(sections[0].text).toBe("Hashing. Choose the key. A hash map gives O of 1 lookup.");
    expect(sections[3].text).toBe("Key takeaways. First, State the key.");
  });

  it("reads arrow flows and tables as sentences", () => {
    const text = sections[1].text;
    expect(text).toContain("Inner search, then Hash lookup, then One pass.");
    expect(text).toContain("Problem asks: Find a pair. Key on: The complement, target minus x.");
    expect(text).not.toContain("|");
  });

  it("announces code instead of reading it, and names it from the lead-in", () => {
    const text = sections[2].text;
    expect(text).toContain("Code example: Seen set, shown on screen.");
    expect(text).toContain("Another code example, shown on screen.");
    expect(text).not.toContain("HashSet");
  });

  it("keeps callout labels, numbers list items, and speaks formulas", () => {
    const text = sections[2].text;
    expect(text).toContain("Tip: say the key out loud.");
    expect(text).toContain("First, Clarify the input. Second, Name the key.");
    expect(text).toContain("Throughput equals requests divided by seconds.");
  });

  it("prefixes unlabelled callouts with Note", () => {
    const [intro] = buildLessonSpeech({ title: "T", content: "> The key is everything." });
    expect(intro.text).toContain("Note: The key is everything.");
  });

  it("splits a long section into parts that stay under the clip limit", () => {
    const paragraph = "This sentence is here to make the section long enough to split. ".repeat(20);
    const parts = buildLessonSpeech({ title: "T", content: `## Big\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}` });
    const big = parts.filter((section) => section.id === "big");
    expect(big.length).toBeGreaterThan(1);
    expect(big.map((section) => section.part)).toEqual(big.map((_, i) => i + 1));
    for (const section of big) expect(section.text.length).toBeLessThanOrEqual(MAX_SECTION_CHARS);
  });

  it("skips visualizer directives", () => {
    const [intro] = buildLessonSpeech({ title: "T", content: ':::viz two-sum {"a":1}\n\nReal text.' });
    expect(intro.text).toBe("T. Real text.");
  });
});

describe("speakInline", () => {
  it("spells out complexity and comparison symbols", () => {
    expect(speakInline("O(n^2) vs O(n log n), n ≤ 10^5")).toBe("O of n squared versus O of n log n, n at most 10 to the power of 5");
    expect(speakInline("a <= b and x != y")).toBe("a less than or equal to b and x not equal to y");
  });

  it("drops markdown emphasis, links and emoji", () => {
    expect(speakInline("**Bold** and *soft* with [docs](https://x.y) 🚀 e.g. this")).toBe(
      "Bold and soft with docs for example, this",
    );
  });
});

describe("speakCode", () => {
  it("reads identifiers and generics like a person would", () => {
    expect(speakCode("getOrDefault")).toBe("get Or Default");
    expect(speakCode("Map<String, List<String>>")).toBe("Map of String, List of String");
    expect(speakCode("nums[i]")).toBe("nums at i");
    expect(speakCode("int[]")).toBe("int array");
    expect(speakCode("target - x")).toBe("target minus x");
    expect(speakCode("computeIfAbsent(key, k -> new ArrayList<>())")).toBe("compute If Absent key, k to new Array List");
    expect(speakCode("map.get(key)")).toBe("map dot get key");
  });
});
