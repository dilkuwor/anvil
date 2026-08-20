import { afterEach, describe, expect, it } from "vitest";

import {
  clearFirstPartyGaCookies,
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

  it("clears first-party GA cookies without touching the session cookie", () => {
    document.cookie = "ia_access_token=secret; path=/";
    document.cookie = "_ga=GA1.1.x; path=/";
    document.cookie = "_ga_ABC123=GS1.1.x; path=/";
    clearFirstPartyGaCookies();
    expect(document.cookie).toContain("ia_access_token");
    expect(document.cookie).not.toMatch(/(?:^|; )_ga=/);
    expect(document.cookie).not.toMatch(/(?:^|; )_ga_/);
  });
});
