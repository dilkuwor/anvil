import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LessonOverlay } from "@/components/learn/lesson-overlay";
import type { LearningLessonDetail } from "@/lib/learn";

const lesson: LearningLessonDetail = {
  id: "lesson-1",
  slug: "back-of-the-envelope-estimation",
  title: "Back-of-the-Envelope Estimation",
  short_description: "QPS and storage.",
  content: "# Back-of-the-Envelope Estimation\n\nEstimate QPS first.",
  takeaways: ["Round aggressively."],
  interview_questions: ["How do you estimate QPS?"],
  estimated_minutes: 16,
  status: "NOT_STARTED",
  category_slug: "system-design",
  category_title: "System Design",
  topic_slug: "capacity-estimation",
  topic_title: "Capacity Estimation",
  previous: null,
  next: null,
  related_problems: [],
};

describe("LessonOverlay", () => {
  it("opens fullscreen with icon toolbar, view toggle, and close on the title", async () => {
    const onClose = vi.fn();
    const onAskAiAuth = vi.fn();
    render(<LessonOverlay lesson={lesson} signedIn={false} onClose={onClose} onAskAiAuth={onAskAiAuth} />);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Back-of-the-Envelope Estimation" })).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Close lesson")).toBeInTheDocument();
    expect(screen.getByLabelText("Exit full width")).toBeInTheDocument();
    expect(screen.getByLabelText("Listen")).toBeInTheDocument();
    expect(screen.getByLabelText("Ask AI")).toBeInTheDocument();
    expect(screen.getByLabelText("Switch to reading view")).toBeInTheDocument();
    expect(screen.getByText(/Estimate QPS first/)).toBeInTheDocument();
    expect(document.querySelector(".lesson-reader")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Switch to reading view"));
    expect(screen.getByLabelText("Switch to compact view")).toBeInTheDocument();
    expect(document.querySelector(".lesson-reader")).toBeInTheDocument();
    expect(document.querySelector(".lesson-reader-page")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Ask AI"));
    expect(onAskAiAuth).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByLabelText("Exit full width"));
    expect(screen.getByLabelText("Maximize lesson")).toBeInTheDocument();
    expect(screen.getByText("System Design · Capacity Estimation")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close lesson"));
    expect(onClose).toHaveBeenCalled();
  });
});
