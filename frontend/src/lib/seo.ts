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
  "/oauth",
  "/system-design/interview",
  "/system-design/history",
  "/problems/lists",
];

export const ROBOTS_DISALLOW = [...PRIVATE_PATHS, "/api/"];

export const PRODUCTION_SITE_URL = "https://anvilprep.dev";

function runtimeEnv(name: string): string {
  return String((process.env as Record<string, string | undefined>)[name] ?? "").trim();
}

export function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!url.hostname || url.hostname === "0.0.0.0") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return false;
  if (host === "frontend" || host === "api") return false;
  if (!host.includes(".")) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
  return true;
}

export function originFromHost(hostHeader?: string | null, protoHeader?: string | null): string | null {
  const host = hostHeader?.split(",")[0]?.trim();
  if (!host) return null;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!isPublicHostname(hostname)) return null;
  const proto = protoHeader?.split(",")[0]?.trim() === "http" ? "https" : protoHeader?.split(",")[0]?.trim() || "https";
  return normalizeOrigin(`${proto}://${hostname}`);
}

export function siteUrl(requestOrigin?: string | null): string {
  return (
    normalizeOrigin(runtimeEnv("SITE_URL")) ||
    normalizeOrigin(runtimeEnv("NEXT_PUBLIC_SITE_URL")) ||
    normalizeOrigin(requestOrigin) ||
    (runtimeEnv("NODE_ENV") === "production" ? PRODUCTION_SITE_URL : "http://localhost:3000")
  );
}

export function absoluteUrl(path = "/", origin?: string | null): string {
  const prefix = siteUrl(origin);
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
  const canonical = !path || path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const desc = truncateMeta(description);
  const ogTitle = typeof title === "string" ? title : title.absolute;
  return {
    title,
    description: desc,
    alternates: { canonical },
    robots: noIndex ? noIndexRobots : indexRobots,
    openGraph: {
      title: ogTitle,
      description: desc,
      url: canonical,
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

export function organizationJsonLd(origin?: string | null) {
  const base = siteUrl(origin);
  return {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_PUBLISHER,
    url: base,
    logo: absoluteUrl("/logo-app-v6.png", base),
    brand: SITE_NAME,
  };
}

export function websiteJsonLd(origin?: string | null) {
  const base = siteUrl(origin);
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    url: base,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${base}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/problems?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareJsonLd(origin?: string | null) {
  const base = siteUrl(origin);
  return {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: base,
    description: SITE_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${base}/#organization` },
  };
}

export function rootJsonLd(origin?: string | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(origin), websiteJsonLd(origin), softwareJsonLd(origin)],
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

