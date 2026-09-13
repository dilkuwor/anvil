import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonMarkdown } from "@/components/learn/markdown";

describe("LessonMarkdown", () => {
  it("renders the system design template mnemonic, table, steps, and memory cue", () => {
    render(
      <LessonMarkdown
        content={`# System Design Template

A repeatable framework.

ASK → SIZE → SHAPE → STRESS → SELL

| Step | What you do |
| --- | --- |
| **ASK** | Requirements |
| **SIZE** | Estimates |

## The Full Interview Flow

1. **Clarify** — What are we building?
2. **Requirements** — Functional + non-functional

## 1. Clarify Requirements

Start with questions.

> Memory cue: ASK = Ask before you architect.
`}
      />,
    );

    expect(screen.getAllByText("ASK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SIZE").length).toBeGreaterThan(0);
    expect(screen.getByText("SHAPE")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Step" })).toBeInTheDocument();
    expect(screen.getByText("The Full Interview Flow")).toBeInTheDocument();
    expect(screen.getByText("Clarify Requirements")).toBeInTheDocument();
    expect(screen.getByText(/ASK = Ask before you architect/)).toBeInTheDocument();
  });

  it("renders formulas, examples, colored buckets, and stat grids", () => {
    render(
      <LessonMarkdown
        content={`# Back-of-the-Envelope Estimation

Cheat sheet.

Average QPS = Requests per day ÷ 100,000

Example: 100 million requests/day ÷ 100,000 ≈ 1,000 QPS

- **1M**/day → ~10 QPS
- **10M**/day → ~100 QPS
- **100M**/day → ~1K QPS
- **1B**/day → ~10K QPS

| Operation | Latency | Mental bucket |
| --- | --- | --- |
| RAM | ~100 ns | Very fast |
| HDD | ~10 ms | Slow |
`}
      />,
    );

    expect(screen.getByText("Formula")).toBeInTheDocument();
    expect(screen.getByText("Average QPS")).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText(/1,000 QPS/)).toBeInTheDocument();
    expect(screen.getByText(/~10 QPS/)).toBeInTheDocument();
    expect(screen.getByText("Very fast")).toBeInTheDocument();
    expect(screen.getByText("Slow")).toBeInTheDocument();
  });

  it("styles section numbers differently from nested step numbers", () => {
    render(
      <LessonMarkdown
        content={`# Back-of-the-Envelope Estimation

Intro.

## 11. Universal Estimation Sequence

1. **100M users**
2. **10% DAU**
`}
      />,
    );

    const section = screen.getByText("11");
    const step = screen.getByText("1");
    expect(section.tagName).toBe("SPAN");
    expect(step.tagName).toBe("SPAN");
    expect(section.className).toContain("bg-accent");
    expect(section.className).toContain("rounded-lg");
    expect(step.className).toContain("rounded-full");
    expect(step.className).toContain("text-muted-foreground");
    expect(step.className).not.toContain("bg-accent");
  });
});

describe("LessonMarkdown — system design curriculum sections", () => {
  it("renders case-study step headings, follow-ups, and pipeline flows", () => {
    render(
      <LessonMarkdown
        content={`# Design a URL Shortener

**Interviewer:** "Design a URL shortening service."

## Why It Matters

This is the most common opening prompt.

## Step 1: Clarify the Requirements

- Can users choose a custom alias?
- Do links expire?

## Step 2: Estimate the Scale

Client → Load balancer → Link service → Redis → Postgres

## Mental Model

A cache is a bet that the same thing will be asked for again soon.

## Trade-offs

| Option | Gain | Cost |
| --- | --- | --- |
| 302 | Analytics | A request every time |

## Interviewer Follow-ups

- What happens if Redis goes down?

## Mini Design Exercise

Set a timer for eight minutes.
`}
      />,
    );

    expect(screen.getByText("Step 1: Clarify the Requirements")).toBeInTheDocument();
    expect(screen.getByText("Step 2: Estimate the Scale")).toBeInTheDocument();
    expect(screen.getByText("Mental Model")).toBeInTheDocument();
    expect(screen.getByText("Interviewer Follow-ups")).toBeInTheDocument();
    expect(screen.getByText("Mini Design Exercise")).toBeInTheDocument();
    // The request-path line renders as a flow diagram, not a paragraph.
    expect(screen.getByText("Link service")).toBeInTheDocument();
    expect(screen.getByText("Redis")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Option" })).toBeInTheDocument();
    expect(screen.getByText(/custom alias/)).toBeInTheDocument();
  });

  it("keeps section headings anchorable for the in-page table of contents", () => {
    const { container } = render(
      <LessonMarkdown
        content={`# Caching

Intro.

## Common Failure Modes

Stampedes and hot keys.

## Step 3: API Design

Two endpoints.
`}
      />,
    );

    expect(container.querySelector("#common-failure-modes")).not.toBeNull();
    expect(container.querySelector("#step-3-api-design")).not.toBeNull();
  });
});

describe("LessonMarkdown — code blocks", () => {
  it("renders fenced Java code verbatim with a language label", () => {
    render(
      <LessonMarkdown
        content={`# Two Pointers

Walk from both ends.

\`\`\`java
int left = 0, right = nums.length - 1;
while (left < right) {

    int sum = nums[left] + nums[right];
    if (sum == target) return new int[] {left, right};
    if (sum < target) left++;
    else right--;
}
\`\`\`

That is O(n) time and O(1) space.
`}
      />,
    );

    const code = document.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toContain("int left = 0, right = nums.length - 1;");
    // A blank line inside the fence must not split the block.
    expect(code?.textContent).toContain("int sum = nums[left] + nums[right];");
    expect(code?.textContent).not.toContain("```");
    expect(screen.getByText("java")).toBeInTheDocument();
    expect(screen.getByText(/O\(n\) time and O\(1\) space/)).toBeInTheDocument();
  });

  it("does not treat a code block as the lead paragraph callout", () => {
    const { container } = render(
      <LessonMarkdown
        content={`# Binary Search

\`\`\`java
int mid = lo + (hi - lo) / 2;
\`\`\`

The prose lead comes after the snippet.
`}
      />,
    );

    const lead = container.querySelector("p.rounded-xl");
    expect(lead?.textContent).toContain("The prose lead comes after the snippet.");
  });
});

describe("LessonMarkdown — visualizers", () => {
  it("renders a :::viz directive as a step-through player and drops unknown ids", () => {
    const { container } = render(
      <LessonMarkdown content={'# T\n\nLead.\n\n## How It Works\n\n:::viz sliding-window {"array": [1,2,3], "target": 3}\n\n:::viz nope\n\nText after.\n'} />,
    );
    expect(container.querySelectorAll(".viz-block").length).toBe(1);
    expect(container.textContent).toContain("Say this to the interviewer");
    expect(container.textContent).toContain("Variable-size sliding window");
    expect(container.textContent).not.toContain(":::viz");
    expect(container.textContent).toContain("Text after.");
  });
});

describe("LessonMarkdown — mobile overflow", () => {
  /**
   * Lesson prose carries unbreakable tokens (API paths, Java call chains) far wider than a
   * ~290px phone content box. Without wrapping they pushed the whole page sideways.
   */
  const LONG = "/v1/conversations/{id}/messages?after_seq=&limit=";

  it("lets long unbreakable tokens wrap instead of widening the page", () => {
    const { container } = render(
      <LessonMarkdown
        content={`# Endpoints

Poll ${LONG} on reconnect.

## How It Works

- Client calls ${LONG} once per resume.

1. Send ${LONG} with the last seq.
`}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("break-words");
    expect(root.className).toContain("min-w-0");

    // Flex/grid children default to min-width:auto, so the long token would still blow out
    // the row unless every text cell opts into min-w-0.
    for (const li of container.querySelectorAll("li")) {
      const cell = li.querySelector("span:last-child");
      if (cell && cell.textContent?.includes(LONG)) {
        expect(cell.className).toContain("min-w-0");
      }
    }
  });

  it("keeps heading labels shrinkable next to their fixed-width icon", () => {
    const { container } = render(
      <LessonMarkdown content={"# T\n\nLead.\n\n## How It Works\n\n### A very long subheading that must wrap on a narrow phone screen\n\nBody.\n"} />,
    );

    for (const heading of container.querySelectorAll("h2, h3")) {
      const spans = heading.querySelectorAll(":scope > span");
      if (spans.length === 2) {
        expect(spans[0].className).toContain("shrink-0");
        expect(spans[1].className).toContain("min-w-0");
      }
    }
  });

  it("scrolls a wide table inside its own box rather than the page", () => {
    const { container } = render(
      <LessonMarkdown
        content={`# T

Lead.

| Endpoint | Notes |
| --- | --- |
| ${LONG} | Resume cursor |
`}
      />,
    );

    const wrapper = container.querySelector("table")?.parentElement as HTMLElement;
    expect(wrapper.className).toContain("overflow-x-auto");
    expect(wrapper.className).toContain("max-w-full");
  });
});
