import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LessonCheck } from "@/components/learn/lesson-check";
import type { LearningLessonDetail } from "@/lib/learn";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ api: { post: (...args: unknown[]) => post(...args) } }));

const lesson = {
  id: "lesson-1",
  slug: "caching",
  title: "Caching",
  topic_slug: "caching",
  learn_state: "learning",
  checks: [
    { id: "q1", key: "a", kind: "choice", prompt: "Hit ratio 95%, 10k rps. DB load?", options: ["500", "5,000"], section: "mental-model", concept: "c", model_answer: null },
    { id: "q2", key: "b", kind: "short_answer", prompt: "Name the stampede fix.", options: [], section: "failures", concept: "c", model_answer: "Request coalescing." },
  ],
  check_state: { total: 2, checked: 0, correct_ids: [], attempted_ids: [] },
  review: null,
} as unknown as LearningLessonDetail;

function renderCheck(data = lesson) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <LessonCheck lesson={data} />
    </QueryClientProvider>,
  );
}

describe("LessonCheck", () => {
  beforeEach(() => post.mockReset());

  it("asks one question at a time, requeues a miss, and finishes when all are right", async () => {
    post
      .mockResolvedValueOnce({ check_id: "q1", correct: false, correct_index: 0, model_answer: null, explanation: "10,000 × 0.05.", section: "mental-model", checked: 0, total: 2, just_checked: false, learn_state: "learning" })
      .mockResolvedValueOnce({ check_id: "q2", correct: true, correct_index: null, model_answer: "Request coalescing.", explanation: "One rebuild.", section: "failures", checked: 1, total: 2, just_checked: false, learn_state: "learning" })
      .mockResolvedValueOnce({ check_id: "q1", correct: true, correct_index: 0, model_answer: null, explanation: "10,000 × 0.05.", section: "mental-model", checked: 2, total: 2, just_checked: true, learn_state: "checked" });
    renderCheck();

    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    const check = screen.getByRole("button", { name: "Check answer" });
    expect(check).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "5,000" }));
    fireEvent.click(screen.getByRole("radio", { name: "Sure" }));
    fireEvent.click(check);

    await waitFor(() => expect(screen.getByText("Not quite")).toBeInTheDocument());
    expect(post).toHaveBeenCalledWith("/api/v1/learn/lessons/lesson-1/checks/q1/answer", expect.objectContaining({ choice: 1, confidence: "sure" }));
    expect(screen.getByText("10,000 × 0.05.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review this section/ })).toHaveAttribute("href", "#mental-model");
    expect(screen.getByText(/comes back at the end of the round/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // Short answer: write, compare, self-grade.
    expect(screen.getByText("Name the stampede fix.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "single flight" } });
    fireEvent.click(screen.getByRole("radio", { name: "Not sure" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByText("Request coalescing.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I had it" }));
    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
    expect(post).toHaveBeenLastCalledWith("/api/v1/learn/lessons/lesson-1/checks/q2/answer", expect.objectContaining({ text: "single flight", correct: true, confidence: "unsure" }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // The missed question returns.
    expect(screen.getByText("Hit ratio 95%, 10k rps. DB load?")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 checked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "500" }));
    fireEvent.click(screen.getByRole("radio", { name: "Sure" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));
    expect(screen.getByText("All 2 checked")).toBeInTheDocument();
  });

  it("shows the checked panel and lets the learner practise again", async () => {
    renderCheck({ ...lesson, learn_state: "checked", check_state: { total: 2, checked: 2, correct_ids: ["q1", "q2"], attempted_ids: ["q1", "q2"] }, review: { cards: 2, reviews: 0, next_due_on: "2099-01-01", last_reviewed_on: null, mastered_at: null } } as LearningLessonDetail);
    expect(screen.getByText("Lesson checked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Practice again/ }));
    // A new round is drawn from the pool after the lesson refetches.
    expect(await screen.findByText("Question 1 of 2")).toBeInTheDocument();
  });
});
