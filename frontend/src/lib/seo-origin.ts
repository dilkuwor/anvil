import { headers } from "next/headers";

import { originFromHost, siteUrl } from "@/lib/seo";

function forwardedHost(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:^|[;,]\s*)host="?([^;,"\s]+)"?/i);
  return match?.[1] ?? null;
}

function schemeFromCfVisitor(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { scheme?: string };
    return parsed.scheme ?? null;
  } catch {
    return null;
  }
}

export async function publicSiteUrl(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ||
    headerList.get("x-original-host") ||
    forwardedHost(headerList.get("forwarded")) ||
    headerList.get("host");
  const proto =
    schemeFromCfVisitor(headerList.get("cf-visitor")) ||
    headerList.get("x-forwarded-proto") ||
    (headerList.get("x-forwarded-ssl") === "on" ? "https" : null);
  return siteUrl(originFromHost(host, proto));
}
