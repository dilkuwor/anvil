import { afterEach, describe, expect, it, vi } from "vitest";

import { writeAnalyticsConsent } from "@/lib/consent";

async function loadAnalytics(measurementId: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", measurementId);
  return import("@/lib/analytics");
}

describe("analytics helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete window.gtag;
    delete window.dataLayer;
    localStorage.clear();
  });

  it("does not send when the measurement ID is missing", async () => {
    const gtag = vi.fn();
    window.gtag = gtag as typeof window.gtag;
    const { trackEvent, AnalyticsEvent } = await loadAnalytics("");
    trackEvent(AnalyticsEvent.Login, { method: "password" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not send before analytics consent", async () => {
    const gtag = vi.fn();
    window.gtag = gtag as typeof window.gtag;
    const { trackEvent, AnalyticsEvent } = await loadAnalytics("G-7Q1GX64YSR");
    trackEvent(AnalyticsEvent.Login, { method: "password" });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends typed events through gtag when present", async () => {
    writeAnalyticsConsent("granted");
    const gtag = vi.fn();
    window.gtag = gtag as typeof window.gtag;
    const { trackEvent, AnalyticsEvent } = await loadAnalytics("G-7Q1GX64YSR");
    trackEvent(AnalyticsEvent.SignUp, { method: "password" });
    expect(gtag).toHaveBeenCalledWith("event", "sign_up", { method: "password" });
  });

  it("sends page_view with path and location", async () => {
    writeAnalyticsConsent("granted");
    const gtag = vi.fn();
    window.gtag = gtag as typeof window.gtag;
    const { trackPageView } = await loadAnalytics("G-7Q1GX64YSR");
    trackPageView("/problems/pair-target");
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "page_view",
      expect.objectContaining({
        page_path: "/problems/pair-target",
        page_location: window.location.href,
      }),
    );
  });
});
