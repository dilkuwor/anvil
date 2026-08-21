import { headers } from "next/headers";

import { originFromHost, siteUrl } from "@/lib/seo";

export async function publicSiteUrl(): Promise<string> {
  const headerList = await headers();
  const requestOrigin = originFromHost(
    headerList.get("x-forwarded-host") || headerList.get("host"),
    headerList.get("x-forwarded-proto"),
  );
  return siteUrl(requestOrigin);
}
