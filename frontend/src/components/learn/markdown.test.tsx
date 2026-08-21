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
