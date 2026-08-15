import { describe, expect, it } from "vitest";

import { formatRelative, formatRuntime, statusLabel } from "@/lib/utils";

describe("formatRuntime", () => {
  it("formats milliseconds", () => {
    expect(formatRuntime(42)).toBe("42ms");
  });
});

describe("statusLabel", () => {
  it("humanizes enum values", () => {
    expect(statusLabel("WRONG_ANSWER")).toBe("Wrong Answer");
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-04-08T12:00:00.000Z");

  it("formats recent minutes", () => {
    expect(formatRelative("2026-04-08T11:48:00.000Z", now)).toBe("12 min ago");
  });

  it("formats yesterday", () => {
    expect(formatRelative("2026-04-07T10:00:00.000Z", now)).toBe("Yesterday");
  });
});
