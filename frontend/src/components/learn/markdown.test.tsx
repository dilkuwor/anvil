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
});
