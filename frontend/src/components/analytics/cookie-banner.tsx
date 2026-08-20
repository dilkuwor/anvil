"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { isAnalyticsEnabled } from "@/lib/analytics";
import {
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  subscribeCookiePreferences,
  writeAnalyticsConsent,
} from "@/lib/consent";

const subscribeClient = () => () => {};

export function CookieBanner() {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeClient, () => true, () => false);
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, readAnalyticsConsent, () => null);

  useEffect(() => subscribeCookiePreferences(() => setPreferencesOpen(true)), []);

  if (!isAnalyticsEnabled || !mounted) return null;

  const showBanner = consent === null && !preferencesOpen;

  return (
    <>
      {showBanner ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-steel-800 bg-steel-900/95 px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="ia-content flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-[13px] leading-6 text-muted-foreground">
              We use essential cookies to keep AnvilPrep working and optional analytics to improve your experience.{" "}
              <Link href="/privacy" className="font-medium text-foreground hover:text-accent">
                Privacy Policy
              </Link>
              <span aria-hidden className="px-1.5">
                ·
              </span>
              <button
                type="button"
                className="font-medium text-foreground hover:text-accent"
                onClick={() => setPreferencesOpen(true)}
              >
                Manage preferences
              </button>
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => writeAnalyticsConsent("denied")}
              >
                Reject analytics
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => writeAnalyticsConsent("granted")}
              >
                Accept all
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {preferencesOpen ? <CookiePreferencesDialog consent={consent} onClose={() => setPreferencesOpen(false)} /> : null}
    </>
  );
}

function CookiePreferencesDialog({
  consent,
  onClose,
}: {
  consent: "granted" | "denied" | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const [analyticsOn, setAnalyticsOn] = useState(consent === "granted");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    writeAnalyticsConsent(analyticsOn ? "granted" : "denied");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-background/70" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-steel-800 bg-steel-900 p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          Cookie preferences
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
          Essential cookies stay on so AnvilPrep works. Analytics is optional.
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-steel-800 bg-background/30 p-3">
            <input
              type="checkbox"
              checked
              disabled
              className="mt-1 h-4 w-4 accent-accent"
              aria-describedby="cookie-essential-help"
            />
            <span>
              <span className="block text-sm font-medium">Essential</span>
              <span id="cookie-essential-help" className="mt-1 block text-[12px] leading-5 text-muted-foreground">
                Always active. Required for sign-in sessions, core features, and necessary preferences such as theme and
                drafts.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-steel-800 bg-background/30 p-3">
            <input
              type="checkbox"
              checked={analyticsOn}
              onChange={(event) => setAnalyticsOn(event.target.checked)}
              className="mt-1 h-4 w-4 accent-accent"
              aria-describedby="cookie-analytics-help"
            />
            <span>
              <span className="block text-sm font-medium">Analytics</span>
              <span id="cookie-analytics-help" className="mt-1 block text-[12px] leading-5 text-muted-foreground">
                Optional. Google Analytics helps us understand how AnvilPrep is used. Turn this off and GA4 will not
                load.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" size="sm" onClick={save}>
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
