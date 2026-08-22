"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";

import { GA_MEASUREMENT_ID, isAnalyticsEnabled, trackPageView } from "@/lib/analytics";
import {
  readAnalyticsConsent,
  setAnalyticsDefaultConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/consent";

function AnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    trackPageView(search ? `${pathname}?${search}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics({ defaultConsent }: { defaultConsent?: AnalyticsConsent | null }) {
  // Mirrors the banner's default so consent is consistent regardless of
  // sibling render order. Idempotent.
  setAnalyticsDefaultConsent(defaultConsent ?? null);

  const consent = useSyncExternalStore(subscribeAnalyticsConsent, readAnalyticsConsent, () => null);
  if (!isAnalyticsEnabled || consent !== "granted") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
`}
      </Script>
      <Suspense fallback={null}>
        <AnalyticsRouteTracker />
      </Suspense>
    </>
  );
}
