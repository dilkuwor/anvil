import { afterEach, describe, expect, it } from "vitest";

import {
  readAnalyticsConsent,
  resetAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/consent";

describe("analytics consent", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("starts unset", () => {
    expect(readAnalyticsConsent()).toBeNull();
  });

  it("stores granted and denied", () => {
    writeAnalyticsConsent("granted");
    expect(readAnalyticsConsent()).toBe("granted");
    writeAnalyticsConsent("denied");
    expect(readAnalyticsConsent()).toBe("denied");
  });

  it("can be reset so the banner can show again", () => {
    writeAnalyticsConsent("granted");
    resetAnalyticsConsent();
    expect(readAnalyticsConsent()).toBeNull();
  });
});
