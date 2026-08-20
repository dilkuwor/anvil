import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoteBody } from "@/components/notes/note-body";

describe("NoteBody", () => {
  it("renders markdown as formatted note content, not raw markers", () => {
    render(
      <NoteBody
        content={`## Capacity planning

A **load balancer** sits in front of *N* app servers.

- Keep **P99** under 200ms
- Size caches by working set

1. Estimate QPS
2. Multiply by payload size
`}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Capacity planning" })).toBeInTheDocument();
    expect(screen.getByText("load balancer").tagName).toBe("STRONG");
    expect(screen.getByText("P99").tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.queryByText("## Capacity planning")).not.toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "Keep P99 under 200ms")).toBeInTheDocument();
    expect(screen.getByText("Estimate QPS")).toBeInTheDocument();
  });

  it("keeps line breaks in plain notes", () => {
    const { container } = render(
      <NoteBody
        content={`First line
Second line`}
      />,
    );
    expect(container.querySelector("p")?.innerHTML).toContain("First line<br>Second line");
  });
});
