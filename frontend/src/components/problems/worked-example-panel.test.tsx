import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkedExamplePanel } from "@/components/problems/worked-example-panel";

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

const example = {
  approach: "Two bound searches",
  idea: "Lower bound twice.",
  steps: ["Lower-bound for target.", "Check it."],
  language: "JAVA",
  header: "class Solution {",
  blocks: [
    "    public int[] searchRange() { return bound(); }",
    "    private int bound() { return 0; }",
  ],
  footer: "}",
  total_levels: 2,
  levels_done: 0,
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WorkedExamplePanel slug="search-range" />
    </QueryClientProvider>,
  );
}

describe("WorkedExamplePanel", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue(example);
  });

  it("shows the full solution, then blanks the last block at level 1 and unlocks level 2 on a pass", async () => {
    postMock.mockResolvedValue({
      passed: true,
      level: 1,
      levels_done: 1,
      total_levels: 2,
      result: {
        status: "ACCEPTED",
        passed: 2,
        total: 2,
        compile_output: null,
        test_results: [],
        submission_id: null,
        runtime_ms: 1,
        memory_kb: 1,
      },
    });
    renderPanel();
    expect(await screen.findByText("Two bound searches")).toBeInTheDocument();
    expect(screen.getByText(/private int bound/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Write it all" })).toBeDisabled();

    fireEvent.click(screen.getByRole("tab", { name: "Level 1" }));
    const blank = screen.getByLabelText("Block 2");
    expect(screen.queryByText(/private int bound/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Check with sample tests/ }),
    ).toBeDisabled();

    fireEvent.change(blank, {
      target: { value: "    private int bound() { return 1; }" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Check with sample tests/ }),
    );
    await waitFor(() =>
      expect(screen.getByText("Passed. Level 2 unlocked.")).toBeInTheDocument(),
    );
    expect(postMock).toHaveBeenCalledWith(
      "/api/v1/problems/search-range/worked-example/check",
      {
        level: 1,
        filled: ["    private int bound() { return 1; }"],
      },
    );
    expect(
      screen.getByRole("tab", { name: "Write it all" }),
    ).not.toBeDisabled();
  });

  it("explains a failed run", async () => {
    postMock.mockResolvedValue({
      passed: false,
      level: 1,
      levels_done: 0,
      total_levels: 2,
      result: {
        status: "COMPILE_ERROR",
        passed: 0,
        total: 2,
        compile_output: "missing ;",
        test_results: [],
        submission_id: null,
        runtime_ms: null,
        memory_kb: null,
      },
    });
    renderPanel();
    fireEvent.click(await screen.findByRole("tab", { name: "Level 1" }));
    fireEvent.change(screen.getByLabelText("Block 2"), {
      target: { value: "oops" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Check with sample tests/ }),
    );
    expect(
      await screen.findByText("0 of 2 sample tests passed."),
    ).toBeInTheDocument();
    expect(screen.getByText("missing ;")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Peek" }));
    expect(screen.getByText(/private int bound/)).toBeInTheDocument();
  });
});
