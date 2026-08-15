import { describe, expect, it } from "vitest";

import { formatCountdown, remainingFromStart } from "@/lib/interview";

describe("interview timer helpers", () => {
  it("formats remaining time as m:ss", () => {
    expect(formatCountdown(2700)).toBe("45:00");
    expect(formatCountdown(2657)).toBe("44:17");
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("derives remaining seconds from backend start time", () => {
    const started = "2026-08-15T10:00:00.000Z";
    const now = Date.parse("2026-08-15T10:02:43.000Z");
    expect(remainingFromStart(started, 2700, now)).toBe(2700 - 163);
  });
});
