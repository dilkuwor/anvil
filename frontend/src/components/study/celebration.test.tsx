import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CelebrationLayer,
  useCelebration,
} from "@/components/study/celebration";

function Harness({ size }: { size: "small" | "big" }) {
  const celebration = useCelebration();
  return (
    <>
      <button
        type="button"
        onClick={() => celebration.fire(size, { x: 10, y: 10 })}
      >
        fire
      </button>
      <CelebrationLayer
        canvasRef={celebration.canvasRef}
        quiet={celebration.quiet}
      />
    </>
  );
}

describe("celebration", () => {
  // jsdom has no 2d canvas; make that explicit instead of letting it log a warning.
  HTMLCanvasElement.prototype.getContext = vi
    .fn()
    .mockReturnValue(
      null,
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  afterEach(() => vi.restoreAllMocks());

  it("shows a quiet line instead of motion when the reader prefers reduced motion", () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    }) as unknown as typeof window.matchMedia;
    render(<Harness size="big" />);
    act(() => screen.getByText("fire").click());
    expect(screen.getByText("Done for today. Well done.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(
      screen.queryByText("Done for today. Well done."),
    ).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does nothing harmful when the browser cannot draw", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    }) as unknown as typeof window.matchMedia;
    render(<Harness size="small" />);
    // jsdom has no 2d canvas context; firing must not throw and must not show the quiet line.
    act(() => screen.getByText("fire").click());
    expect(screen.queryByText(/done/i)).not.toBeInTheDocument();
    expect(document.querySelector("canvas")).toHaveClass("pointer-events-none");
  });
});
