import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BuddyButton, BuddyDrawer } from "@/components/buddy/buddy-drawer";
import {
  BuddyProvider,
  useBuddyPageContext,
} from "@/components/buddy/buddy-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/learn",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const getMock = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: { ...original.api, get: (...args: unknown[]) => getMock(...args) },
  };
});

const sendMock = vi.fn();
vi.mock("@/lib/buddy", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/buddy")>();
  return {
    ...original,
    sendBuddyMessage: (...args: unknown[]) => sendMock(...args),
  };
});

vi.mock("@/components/learn/markdown", () => ({
  TutorMarkdown: ({ content }: { content: string }) => (
    <div data-testid="reply">{content}</div>
  ),
}));
vi.mock("@/components/notes/notes-drawer", () => ({
  SaveAiNoteButton: () => <button type="button">Save note</button>,
}));

function LessonPage() {
  useBuddyPageContext({
    kind: "lesson",
    id: "capacity-estimation",
    title: "Capacity Estimation",
    noteSourceId: "lesson-1",
  });
  return <p>Lesson body</p>;
}

function renderBuddy(page?: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BuddyProvider>
        <BuddyButton />
        {page}
        <BuddyDrawer />
      </BuddyProvider>
    </QueryClientProvider>,
  );
}

describe("Buddy drawer", () => {
  beforeEach(() => {
    getMock.mockReset();
    sendMock.mockReset();
    getMock.mockResolvedValue([]);
  });

  it("opens from the header button and sends a question with the page context", async () => {
    sendMock.mockImplementation(
      async (_body: unknown, onDelta: (delta: string) => void) => {
        onDelta("Estimate ");
        onDelta("first.");
        return {
          text: "Estimate first.",
          threadId: "t1",
          messageId: "m2",
          partial: false,
        };
      },
    );
    renderBuddy(<LessonPage />);

    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    expect(
      await screen.findByRole("dialog", { name: "Buddy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Capacity Estimation", { exact: false }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith(
        "/api/v1/buddy/threads?context_kind=lesson&context_id=capacity-estimation",
      ),
    );

    const input = await screen.findByPlaceholderText(
      /Ask about Capacity Estimation/,
    );
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, { target: { value: "Why estimate first?" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(screen.getByTestId("reply")).toHaveTextContent("Estimate first."),
    );
    expect(screen.getByText("Why estimate first?")).toBeInTheDocument();
    const body = sendMock.mock.calls[0][0] as {
      thread_id: string | null;
      mode: string;
      context: Record<string, string>;
    };
    expect(body.thread_id).toBeNull();
    expect(body.mode).toBe("ask");
    expect(body.context).toEqual({
      kind: "lesson",
      id: "capacity-estimation",
      title: "Capacity Estimation",
      code: undefined,
    });
    expect(
      screen.getByRole("button", { name: "Read this reply aloud" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Save note")).toBeInTheDocument();
  });

  it("uses explain-it-back mode and shows a failure without keeping an empty reply", async () => {
    const { ApiError } = await import("@/lib/api");
    sendMock.mockRejectedValue(
      new ApiError(
        503,
        "An OpenAI API key is required. Add one in Settings.",
        "service_unavailable",
      ),
    );
    renderBuddy();

    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    fireEvent.click(
      await screen.findByRole("tab", { name: "Explain it back" }),
    );
    const input = screen.getByPlaceholderText(
      /Explain the idea in your own words/,
    );
    await waitFor(() => expect(input).not.toBeDisabled());
    fireEvent.change(input, {
      target: { value: "A quorum is more than half." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText(
        "An OpenAI API key is required. Add one in Settings.",
      ),
    ).toBeInTheDocument();
    expect((sendMock.mock.calls[0][0] as { mode: string }).mode).toBe("teach");
    expect(screen.queryByTestId("reply")).not.toBeInTheDocument();
    expect(screen.getByText("A quorum is more than half.")).toBeInTheDocument();
  });

  it("resumes the latest conversation for the page and lists history", async () => {
    getMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/buddy/threads" || path.startsWith("/api/v1/buddy/threads?")) {
        return [
          {
            id: "t9",
            context_kind: "general",
            context_id: "",
            context_title: "",
            title: "Earlier chat",
            preview: "Hi",
            message_count: 2,
            created_at: "",
            updated_at: "",
          },
        ];
      }
      if (path === "/api/v1/buddy/threads/t9") {
        return {
          id: "t9",
          messages: [
            {
              id: "a",
              role: "user",
              content: "Earlier question",
              mode: "ask",
              created_at: "",
            },
            {
              id: "b",
              role: "assistant",
              content: "Earlier answer",
              mode: "ask",
              created_at: "",
            },
          ],
        };
      }
      return [];
    });
    renderBuddy();
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    expect(await screen.findByText("Earlier question")).toBeInTheDocument();
    expect(screen.getByTestId("reply")).toHaveTextContent("Earlier answer");

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(await screen.findByText("Earlier chat")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to chat" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
    });
    expect(screen.queryByText("Earlier question")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Ask me anything about your interview prep/),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    renderBuddy();
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    expect(
      await screen.findByRole("dialog", { name: "Buddy" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Buddy" }),
      ).not.toBeInTheDocument(),
    );
  });
});
