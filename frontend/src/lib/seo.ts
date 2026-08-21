import type { Metadata } from "next";

export const SITE_NAME = "Anvil";
export const SITE_TAGLINE = "Build Skills. Break Limits. Ace the Interview.";
export const SITE_DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "Anvil is a ByteTech LLC product that helps software engineers prepare for technical interviews with coding problems, system design, AI/ML lessons, mock interviews, and cheat sheets.";
export const SITE_PUBLISHER = "ByteTech LLC";

const PRIVATE_PATHS = [
  "/dashboard",
  "/settings",
  "/notes",
  "/login",
  "/register",
  "/system-design/interview",
  "/system-design/history",
  "/problems/lists",
];

export const ROBOTS_DISALLOW = [...PRIVATE_PATHS, "/api/"];

export function siteUrl(): string {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  const cleaned = raw.replace(/\/+$/, "");
  try {
    return new URL(cleaned).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function absoluteUrl(path = "/"): string {
  const prefix = siteUrl();
  if (!path || path === "/") return `${prefix}/`;
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateMeta(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false, noimageindex: true },
};

export const indexRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function pageMeta({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string | { absolute: string };
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const desc = truncateMeta(description);
  const ogTitle = typeof title === "string" ? title : title.absolute;
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    robots: noIndex ? noIndexRobots : indexRobots,
    openGraph: {
      title: ogTitle,
      description: desc,
      url,
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: desc,
    },
  };
}

export function noIndexMeta(title: string, path: string, description = SITE_DESCRIPTION): Metadata {
  return pageMeta({ title, description, path, noIndex: true });
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${siteUrl()}/#organization`,
    name: SITE_PUBLISHER,
    url: siteUrl(),
    logo: absoluteUrl("/logo-app-v6.png"),
    brand: SITE_NAME,
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    name: SITE_NAME,
    url: siteUrl(),
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${siteUrl()}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/problems?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareJsonLd() {
  return {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl(),
    description: SITE_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${siteUrl()}/#organization` },
  };
}

export function rootJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), websiteJsonLd(), softwareJsonLd()],
  };
}

export function learningResourceJsonLd(input: {
  title: string;
  description: string;
  url: string;
  topicTitle: string;
  minutes?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: input.title,
    description: truncateMeta(input.description, 300),
    url: input.url,
    learningResourceType: "Lesson",
    isAccessibleForFree: true,
    inLanguage: "en-US",
    isPartOf: { "@type": "Course", name: input.topicTitle, url: input.url },
    timeRequired: input.minutes ? `PT${input.minutes}M` : undefined,
    publisher: { "@id": `${siteUrl()}/#organization` },
  };
}
