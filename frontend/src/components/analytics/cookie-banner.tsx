"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { isAnalyticsEnabled } from "@/lib/analytics";
import { readAnalyticsConsent, subscribeAnalyticsConsent, writeAnalyticsConsent } from "@/lib/consent";

const subscribeClient = () => () => {};

export function CookieBanner() {
  const mounted = useSyncExternalStore(subscribeClient, () => true, () => false);
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, readAnalyticsConsent, () => null);

  if (!isAnalyticsEnabled || !mounted || consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-steel-800 bg-steel-900/95 px-4 py-3 shadow-lg backdrop-blur-md">
      <div className="ia-content flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
          We use a sign-in cookie to keep you logged in. Optional Google Analytics cookies help us understand how Anvil
          is used. See the{" "}
          <Link href="/privacy" className="font-medium text-foreground hover:text-accent">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => writeAnalyticsConsent("denied")}>
            Reject
          </Button>
          <Button type="button" size="sm" onClick={() => writeAnalyticsConsent("granted")}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
