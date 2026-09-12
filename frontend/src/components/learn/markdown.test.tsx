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
