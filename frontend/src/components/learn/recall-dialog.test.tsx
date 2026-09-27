import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecallDialog } from "@/components/learn/recall-dialog";

const postMock = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: { ...original.api, post: (...args: unknown[]) => postMock(...args) },
  };
});

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RecallDialog
        lessonId="l1"
        lessonTitle="Capacity Estimation"
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return onClose;
}

describe("RecallDialog", () => {
  beforeEach(() => postMock.mockReset());

  it("grades what was written and ticks the covered takeaways", async () => {
    postMock.mockResolvedValue({
      items: [
        {
          takeaway: "Estimate before you design.",
          covered: true,
          note: "Clear.",
        },
        { takeaway: "Round to powers of ten.", covered: false, note: "" },
      ],
      covered: 1,
      total: 2,
      feedback: "Good start. Review rounding.",
    });
    renderDialog();
    expect(
      screen.getByRole("dialog", { name: "Recall from memory" }),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Check my recall" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("What do you remember?"), {
      target: { value: "Estimate first." },
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByText("1 of 2 key points covered")).toBeInTheDocument(),
    );
    expect(postMock).toHaveBeenCalledWith("/api/v1/learn/lessons/l1/recall", {
      text: "Estimate first.",
    });
    expect(screen.getByText("Round to powers of ten.")).toBeInTheDocument();
    expect(
      screen.getByText("Good start. Review rounding."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByPlaceholderText("What do you remember?")).toHaveValue(
      "",
    );
  });

  it("closes with Escape", () => {
    const onClose = renderDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
