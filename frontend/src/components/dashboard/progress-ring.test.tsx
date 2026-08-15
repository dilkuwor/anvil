import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressRing } from "@/components/dashboard/progress-ring";
import type { ProgressSummary } from "@/lib/api";

const empty: ProgressSummary = {
  total_solved: 0,
  easy_solved: 0,
  medium_solved: 0,
  hard_solved: 0,
  problems_attempted: 0,
  problems_attempting: 0,
  total_problems: 15,
  easy_total: 5,
  medium_total: 7,
  hard_total: 3,
  today_solved: 0,
  total_submissions: 0,
  accepted_submissions: 0,
  current_streak: 0,
  longest_streak: 0,
  recent_activity: [],
  recent_events: [],
};

describe("ProgressRing", () => {
  it("renders a zero-progress state without crashing", () => {
    render(<ProgressRing data={empty} />);
    expect(screen.getByText("0/15")).toBeInTheDocument();
    expect(screen.getByText("0 Attempting")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/0 of 15 problems solved/i);
  });
});
