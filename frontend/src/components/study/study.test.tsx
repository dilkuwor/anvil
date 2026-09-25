import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DailyRing } from "@/components/study/daily-ring";
import { TodayView } from "@/components/study/today-view";
import { nextDueLabel, type TodayPlan } from "@/lib/study";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: { ...original.api, get: (...args: unknown[]) => getMock(...args), post: (...args: unknown[]) => postMock(...args) },
  };
});

function plan(overrides: Partial<TodayPlan> = {}): TodayPlan {
  return {
    day: "2026-10-01",
    unit_number: 1,
    unit_title: "Arrays & Hashing",
    tasks: [
      {
        id: "review",
        kind: "review",
        title: "2 cards due",
        why: "Two Sum, Group Anagrams",
        minutes: 6,
        href: "/today/review",
        action: "Start review",
        done: false,
        manual: false,
        optional: false,
        ref: "",
      },
      {
        id: "problem:lc-1",
        kind: "problem",
        title: "Two Sum",
        why: "Core problem 1 of 8 in Arrays & Hashing.",
        minutes: 15,
        href: "/problems/lc-1",
        action: "Open problem",
        done: false,
        manual: false,
        optional: false,
        ref: "lc-1",
      },
      {
        id: "story:lc-9999",
        kind: "optional",
        title: "Replay the story: Nothing",
        why: "Only if you have energy left.",
        minutes: 5,
        href: "/problems/lc-9999?tab=story",
        action: "Replay",
        done: false,
        manual: false,
        optional: true,
        ref: "lc-9999",
      },
    ],
    done_count: 0,
    total: 2,
    due_reviews: 2,
    all_done: false,
    finish_line: "",
    pacing: "Unit 1 of 10.",
    readiness: null,
    recall_rate: null,
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("DailyRing", () => {
  it("names its progress for screen readers", () => {
    render(<DailyRing done={1} total={4} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("1 of 4 tasks done today");
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });
});

describe("TodayView", () => {
  it("lists the day's tasks in order and hides an optional story that has no story", async () => {
    getMock.mockResolvedValueOnce(plan());
    renderWithClient(<TodayView />);
    expect(await screen.findByText("2 cards due")).toBeInTheDocument();
    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.queryByText(/Replay the story/)).not.toBeInTheDocument();
    expect(screen.getByText("0 of 2 done")).toBeInTheDocument();
  });

  it("marks a task done through the API and shows the finish line", async () => {
    getMock.mockResolvedValueOnce(plan());
    const finished = plan({
      tasks: plan().tasks.map((task) => ({ ...task, done: true, manual: true })),
      done_count: 2,
      all_done: true,
      finish_line: "Arrays & Hashing: 1 of 8 core problems solved.",
    });
    postMock.mockResolvedValueOnce(finished);
    renderWithClient(<TodayView />);
    await screen.findByText("2 cards due");
    fireEvent.click(screen.getByRole("button", { name: "Mark 2 cards due done" }));
    expect(await screen.findByText("Arrays & Hashing: 1 of 8 core problems solved.")).toBeInTheDocument();
    expect(postMock.mock.calls[0][0]).toBe("/api/v1/study/today/tasks/review/toggle");
    expect(screen.getAllByText("Done for today").length).toBeGreaterThan(0);
  });
});

describe("nextDueLabel", () => {
  it("speaks in days", () => {
    expect(nextDueLabel("2026-10-01", "2026-10-01")).toBe("today");
    expect(nextDueLabel("2026-10-02", "2026-10-01")).toBe("tomorrow");
    expect(nextDueLabel("2026-10-04", "2026-10-01")).toBe("in 3 days");
  });
});
