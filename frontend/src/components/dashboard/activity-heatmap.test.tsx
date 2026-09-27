import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";

describe("ActivityHeatmap", () => {
  it("shows an empty state when there is no calendar data", () => {
    render(<ActivityHeatmap days={[]} />);
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
  });

  it("renders a year grid when activity exists", () => {
    render(
      <ActivityHeatmap
        days={[{ date: "2026-08-15", problems_solved: 1, submissions: 1, practice_minutes: 5, runs: 0 }]}
      />,
    );
    expect(screen.getByText("1 active day")).toBeInTheDocument();
  });
});
