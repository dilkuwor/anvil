import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { CookieBanner } from "@/components/analytics/cookie-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { JsonLd } from "@/components/seo/json-ld";
import { Providers } from "@/components/providers";
import {
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_PUBLISHER,
  indexRobots,
  rootJsonLd,
} from "@/lib/seo";
import { publicSiteUrl } from "@/lib/seo-origin";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const origin = await publicSiteUrl();
  const googleVerification = String(
    (process.env as Record<string, string | undefined>).GOOGLE_SITE_VERIFICATION ?? "",
  ).trim();
  return {
    metadataBase: new URL(origin),
    title: {
      default: SITE_DEFAULT_TITLE,
      template: "%s · Anvil",
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_PUBLISHER }],
    creator: SITE_PUBLISHER,
    publisher: SITE_PUBLISHER,
    category: "education",
    keywords: [
      "software engineering interview",
      "coding interview practice",
      "system design interview",
      "data structures and algorithms",
      "machine learning interview",
      "mock interview",
      "Anvil",
    ],
    robots: indexRobots,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: origin,
      siteName: SITE_NAME,
      title: SITE_DEFAULT_TITLE,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_DEFAULT_TITLE,
      description: SITE_DESCRIPTION,
    },
    icons: {
      icon: [{ url: "/logo-app-v6.png", type: "image/png" }],
      apple: "/logo-app-v6.png",
      shortcut: "/logo-app-v6.png",
    },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const origin = await publicSiteUrl();
  // Runtime server env (not NEXT_PUBLIC_*): set COOKIE_BANNER=false in the
  // hosting environment to hide the banner and enable analytics by default.
  const cookieBannerEnabled = process.env.COOKIE_BANNER !== "false";
  const analyticsDefaultConsent = cookieBannerEnabled ? null : ("granted" as const);
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} min-h-full dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <JsonLd data={rootJsonLd(origin)} />
        <Providers>{children}</Providers>
        <CookieBanner bannerEnabled={cookieBannerEnabled} />
        <Suspense fallback={null}>
          <GoogleAnalytics defaultConsent={analyticsDefaultConsent} />
        </Suspense>
      </body>
    </html>
  );
}
