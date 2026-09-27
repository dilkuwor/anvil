import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PatternDrill } from "@/components/study/pattern-drill";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today/drill",
  useRouter: () => ({ push: vi.fn() }),
}));

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: {
      ...original.api,
      get: (...args: unknown[]) => getMock(...args),
      post: (...args: unknown[]) => postMock(...args),
    },
  };
});

const items = [
  {
    problem_id: "p1",
    slug: "one",
    difficulty: "EASY",
    statement: "Find the longest substring without repeating characters.",
    example_input: "abcabcbb",
    example_output: "3",
    options: ["Sliding window", "Stack", "Trie", "Heap"],
    due: false,
  },
  {
    problem_id: "p2",
    slug: "two",
    difficulty: "MEDIUM",
    statement: "Merge overlapping intervals.",
    example_input: "",
    example_output: "",
    options: ["Intervals", "Trie", "Heap", "Stack"],
    due: true,
  },
];

function renderDrill() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PatternDrill />
    </QueryClientProvider>,
  );
}

describe("PatternDrill", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ items, drilled_today: 0, families: [] });
  });

  it("grades a pick, reveals the pattern, and ends with a summary", async () => {
    postMock
      .mockResolvedValueOnce({
        correct: true,
        correct_index: 0,
        family: "Sliding window",
        family_hint: "A contiguous run with a rule.",
        pattern: "Sliding window, at most k distinct",
        trigger: "Longest substring with a rule.",
        summary: "",
        title: "Longest Substring",
        href: "/problems/one",
        next_due_on: "2026-10-01",
        box: 2,
      })
      .mockResolvedValueOnce({
        correct: false,
        correct_index: 0,
        family: "Intervals",
        family_hint: "Sort then sweep.",
        pattern: "Sort by start, then sweep",
        trigger: "Overlapping ranges.",
        summary: "",
        title: "Merge Intervals",
        href: "/problems/two",
        next_due_on: "2026-09-29",
        box: 1,
      });
    renderDrill();

    expect(
      await screen.findByText(/longest substring without repeating/),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sliding window/ }));
    await waitFor(() => expect(screen.getByText(/Right/)).toBeInTheDocument());
    expect(postMock).toHaveBeenCalledWith(
      "/api/v1/study/drill/patterns/p1/answer",
      expect.objectContaining({ choice: 0, confidence: "sure" }),
    );
    expect(
      screen.getByText("Longest substring with a rule."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Longest Substring →" }),
    ).toHaveAttribute("href", "/problems/one");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText("Merge overlapping intervals."),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "2" });
    await waitFor(() =>
      expect(
        screen.getByText(/Not quite. It is Intervals./),
      ).toBeInTheDocument(),
    );
    fireEvent.keyDown(window, { key: "Enter" });

    expect(await screen.findByText("Drill done")).toBeInTheDocument();
    expect(
      screen.getByText(/1 of 2 right, 1 recognised fast/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Merge Intervals" }),
    ).toBeInTheDocument();
  });
});
